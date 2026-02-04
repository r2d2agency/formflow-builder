const express = require('express');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/forms
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let countQuery, dataQuery;

    if (isAdmin) {
      // Admin sees all forms
      countQuery = 'SELECT COUNT(*) FROM forms';
      dataQuery = 'SELECT * FROM forms ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    } else {
      // Regular user only sees assigned forms
      countQuery = `
        SELECT COUNT(*) FROM forms f
        INNER JOIN user_forms uf ON f.id = uf.form_id
        WHERE uf.user_id = $1
      `;
      dataQuery = `
        SELECT f.* FROM forms f
        INNER JOIN user_forms uf ON f.id = uf.form_id
        WHERE uf.user_id = $1
        ORDER BY f.created_at DESC
        LIMIT $2 OFFSET $3
      `;
    }

    const countResult = isAdmin 
      ? await pool.query(countQuery)
      : await pool.query(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count);

    const result = isAdmin
      ? await pool.query(dataQuery, [limit, offset])
      : await pool.query(dataQuery, [userId, limit, offset]);

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
    console.error('Get forms error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar formulários' });
  }
});

// GET /api/forms/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM forms WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar formulário' });
  }
});

// GET /api/forms/slug/:slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT * FROM forms WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get form by slug error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar formulário' });
  }
});

// POST /api/forms
router.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { name, slug, description, type, fields, settings, is_active } = req.body;

    const result = await pool.query(
      `INSERT INTO forms (name, slug, description, type, fields, settings, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, description, type, JSON.stringify(fields || []), JSON.stringify(settings || {}), is_active ?? true]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create form error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Slug já existe' });
    }
    res.status(500).json({ success: false, error: 'Erro ao criar formulário' });
  }
});

// PUT /api/forms/:id
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { name, slug, description, type, fields, settings, is_active } = req.body;

    const result = await pool.query(
      `UPDATE forms 
       SET name = $1, slug = $2, description = $3, type = $4, fields = $5, settings = $6, is_active = $7
       WHERE id = $8
       RETURNING *`,
      [name, slug, description, type, JSON.stringify(fields || []), JSON.stringify(settings || {}), is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update form error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Slug já existe' });
    }
    res.status(500).json({ success: false, error: 'Erro ao atualizar formulário' });
  }
});

// DELETE /api/forms/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM forms WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
    }

    res.json({ success: true, message: 'Formulário excluído com sucesso' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir formulário' });
  }
});

module.exports = router;
