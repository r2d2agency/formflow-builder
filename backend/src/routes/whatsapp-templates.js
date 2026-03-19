const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateToken);

// GET /api/whatsapp-templates - List all templates (with optional category filter)
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { category } = req.query;

    let query = 'SELECT * FROM whatsapp_templates ORDER BY category, name';
    let params = [];

    if (category) {
      query = 'SELECT * FROM whatsapp_templates WHERE category = $1 ORDER BY name';
      params = [category];
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[WhatsApp Templates] List error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar templates' });
  }
});

// GET /api/whatsapp-templates/categories - List distinct categories
router.get('/categories', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT DISTINCT category FROM whatsapp_templates WHERE category IS NOT NULL ORDER BY category'
    );
    res.json({ success: true, data: result.rows.map(r => r.category) });
  } catch (error) {
    console.error('[WhatsApp Templates] Categories error:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar categorias' });
  }
});

// GET /api/whatsapp-templates/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM whatsapp_templates WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[WhatsApp Templates] Get error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar template' });
  }
});

// POST /api/whatsapp-templates
router.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { name, category, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ success: false, error: 'Nome e mensagem são obrigatórios' });
    }

    const result = await pool.query(
      `INSERT INTO whatsapp_templates (name, category, message, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, category || null, JSON.stringify(message), req.user.id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[WhatsApp Templates] Create error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar template' });
  }
});

// PUT /api/whatsapp-templates/:id
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { name, category, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ success: false, error: 'Nome e mensagem são obrigatórios' });
    }

    const result = await pool.query(
      `UPDATE whatsapp_templates SET name = $1, category = $2, message = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name, category || null, JSON.stringify(message), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[WhatsApp Templates] Update error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar template' });
  }
});

// DELETE /api/whatsapp-templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;

    const result = await pool.query('DELETE FROM whatsapp_templates WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template não encontrado' });
    }

    res.json({ success: true, message: 'Template removido com sucesso' });
  } catch (error) {
    console.error('[WhatsApp Templates] Delete error:', error);
    res.status(500).json({ success: false, error: 'Erro ao remover template' });
  }
});

module.exports = router;
