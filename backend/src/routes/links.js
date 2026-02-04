const express = require('express');
const authMiddleware = require('../middleware/auth');
const UAParser = require('ua-parser-js');

const router = express.Router();

// Generate random code
const generateCode = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Parse user agent for device info
const parseUserAgent = (userAgent) => {
  if (!userAgent) return { device_type: null, browser: null, os: null };
  
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  let device_type = 'desktop';
  if (result.device.type === 'mobile') device_type = 'mobile';
  else if (result.device.type === 'tablet') device_type = 'tablet';
  
  return {
    device_type,
    browser: result.browser.name || null,
    os: result.os.name || null,
  };
};

// ============ PROTECTED ROUTES (require auth) ============
const protectedRouter = express.Router();
protectedRouter.use(authMiddleware);

// GET /api/links - List all links with click counts
protectedRouter.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM short_links');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(`
      SELECT 
        sl.*,
        COUNT(lc.id) as click_count,
        u.name as created_by_name
      FROM short_links sl
      LEFT JOIN link_clicks lc ON sl.id = lc.link_id
      LEFT JOIN users u ON sl.created_by = u.id
      GROUP BY sl.id, u.name
      ORDER BY sl.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      success: true,
      data: {
        data: result.rows,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar links' });
  }
});

// GET /api/links/:id - Get single link with stats
protectedRouter.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;

    const linkResult = await pool.query(`
      SELECT 
        sl.*,
        COUNT(lc.id) as click_count,
        u.name as created_by_name
      FROM short_links sl
      LEFT JOIN link_clicks lc ON sl.id = lc.link_id
      LEFT JOIN users u ON sl.created_by = u.id
      WHERE sl.id = $1
      GROUP BY sl.id, u.name
    `, [id]);

    if (linkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Link não encontrado' });
    }

    // Get click statistics
    const clicksResult = await pool.query(`
      SELECT 
        clicked_at,
        ip_address,
        device_type,
        browser,
        os,
        referer,
        country,
        city
      FROM link_clicks
      WHERE link_id = $1
      ORDER BY clicked_at DESC
      LIMIT 100
    `, [id]);

    // Get aggregated stats
    const statsResult = await pool.query(`
      SELECT 
        device_type,
        COUNT(*) as count
      FROM link_clicks
      WHERE link_id = $1
      GROUP BY device_type
    `, [id]);

    const browserStats = await pool.query(`
      SELECT 
        browser,
        COUNT(*) as count
      FROM link_clicks
      WHERE link_id = $1 AND browser IS NOT NULL
      GROUP BY browser
      ORDER BY count DESC
      LIMIT 10
    `, [id]);

    const dailyStats = await pool.query(`
      SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as count
      FROM link_clicks
      WHERE link_id = $1 AND clicked_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(clicked_at)
      ORDER BY date DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...linkResult.rows[0],
        clicks: clicksResult.rows,
        device_stats: statsResult.rows,
        browser_stats: browserStats.rows,
        daily_stats: dailyStats.rows,
      },
    });
  } catch (error) {
    console.error('Get link error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar link' });
  }
});

// POST /api/links - Create new link
protectedRouter.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { original_url, title, code, expires_at } = req.body;
    const userId = req.user.id;

    if (!original_url) {
      return res.status(400).json({ success: false, error: 'URL original é obrigatória' });
    }

    // Generate or validate code
    let finalCode = code;
    if (!finalCode) {
      finalCode = generateCode();
    }

    // Check if code already exists
    const existingCode = await pool.query(
      'SELECT id FROM short_links WHERE code = $1',
      [finalCode]
    );

    if (existingCode.rows.length > 0) {
      if (code) {
        return res.status(400).json({ success: false, error: 'Este código já está em uso' });
      }
      // Regenerate if auto-generated
      finalCode = generateCode(8);
    }

    const result = await pool.query(`
      INSERT INTO short_links (code, original_url, title, created_by, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [finalCode, original_url, title || null, userId, expires_at || null]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create link error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Código já existe' });
    }
    res.status(500).json({ success: false, error: 'Erro ao criar link' });
  }
});

// PUT /api/links/:id - Update link
protectedRouter.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { original_url, title, code, is_active, expires_at } = req.body;

    const result = await pool.query(`
      UPDATE short_links 
      SET original_url = $1, title = $2, code = $3, is_active = $4, expires_at = $5
      WHERE id = $6
      RETURNING *
    `, [original_url, title, code, is_active, expires_at || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Link não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update link error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Código já existe' });
    }
    res.status(500).json({ success: false, error: 'Erro ao atualizar link' });
  }
});

// DELETE /api/links/:id - Delete link
protectedRouter.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'DELETE FROM short_links WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Link não encontrado' });
    }

    res.json({ success: true, message: 'Link excluído com sucesso' });
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir link' });
  }
});

// ============ PUBLIC ROUTE (redirect) ============

// GET /l/:code - Redirect to original URL (public)
router.get('/:code', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { code } = req.params;

    const result = await pool.query(
      'SELECT * FROM short_links WHERE code = $1 AND is_active = true',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Link não encontrado' });
    }

    const link = result.rows[0];

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'Link expirado' });
    }

    // Track click
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || null;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const { device_type, browser, os } = parseUserAgent(userAgent);

    await pool.query(`
      INSERT INTO link_clicks (link_id, ip_address, user_agent, referer, device_type, browser, os)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [link.id, ip, userAgent, referer, device_type, browser, os]);

    // Redirect
    res.redirect(301, link.original_url);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).json({ success: false, error: 'Erro no redirecionamento' });
  }
});

// Mount protected routes
router.use('/', protectedRouter);

module.exports = router;
