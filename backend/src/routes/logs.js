const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

router.use(adminOnly);

// GET /api/logs/integrations
router.get('/integrations', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { form_id, status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT l.*, f.name as form_name 
      FROM integration_logs l
      LEFT JOIN forms f ON l.form_id = f.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (form_id) {
      query += ` AND l.form_id = $${paramCount}`;
      params.push(form_id);
      paramCount++;
    }

    if (status) {
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Count total for pagination
    const countResult = await pool.query('SELECT COUNT(*) FROM integration_logs');

    res.json({
              success: true,
              logs: result.rows,
              total: parseInt(countResult.rows[0].count),
              page: Math.floor(offset / limit) + 1,
              limit: parseInt(limit)
            });
  } catch (error) {
    console.error('Get integration logs error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar logs' });
  }
});

// DELETE /api/logs/integrations/clear
router.delete('/integrations/clear', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await pool.query('DELETE FROM integration_logs'); // Limpa tudo (cuidado)
    // Ou delete older than 30 days...
    res.json({ success: true, message: 'Logs limpos com sucesso' });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ success: false, error: 'Erro ao limpar logs' });
  }
});

module.exports = router;
