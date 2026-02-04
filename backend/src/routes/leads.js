const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM leads');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT l.*, f.name as form_name, f.slug as form_slug
       FROM leads l
       JOIN forms f ON l.form_id = f.id
       ORDER BY l.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

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
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar leads' });
  }
});

// GET /api/leads/form/:formId
router.get('/form/:formId', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM leads WHERE form_id = $1',
      [req.params.formId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT l.*, f.name as form_name
       FROM leads l
       JOIN forms f ON l.form_id = f.id
       WHERE l.form_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.formId, limit, offset]
    );

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
    console.error('Get leads by form error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      `SELECT l.*, f.name as form_name
       FROM leads l
       JOIN forms f ON l.form_id = f.id
       WHERE l.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }

    res.json({ success: true, message: 'Lead excluído com sucesso' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir lead' });
  }
});

// GET /api/leads/export
router.get('/export/csv', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const formId = req.query.form_id;

    let query = `
      SELECT l.id, l.data, l.source, l.ip_address, l.created_at, f.name as form_name
      FROM leads l
      JOIN forms f ON l.form_id = f.id
    `;
    const params = [];

    if (formId) {
      query += ' WHERE l.form_id = $1';
      params.push(formId);
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);

    // Convert to CSV
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Nenhum lead encontrado' });
    }

    const headers = ['ID', 'Formulário', 'Dados', 'Fonte', 'IP', 'Data'];
    const rows = result.rows.map(row => [
      row.id,
      row.form_name,
      JSON.stringify(row.data),
      row.source || '',
      row.ip_address || '',
      row.created_at,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export leads error:', error);
    res.status(500).json({ success: false, error: 'Erro ao exportar leads' });
  }
});

module.exports = router;
