const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let statsQuery;
    let params = [];

    if (isAdmin) {
      statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM forms) as total_forms,
          (SELECT COUNT(*) FROM forms WHERE is_active = true) as active_forms,
          (SELECT COUNT(*) FROM leads) as total_leads,
          (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '1 day') as leads_today,
          (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '7 days') as leads_this_week,
          (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '30 days') as leads_this_month
      `;
    } else {
      statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM forms f JOIN user_forms uf ON f.id = uf.form_id WHERE uf.user_id = $1) as total_forms,
          (SELECT COUNT(*) FROM forms f JOIN user_forms uf ON f.id = uf.form_id WHERE uf.user_id = $1 AND f.is_active = true) as active_forms,
          (SELECT COUNT(*) FROM leads l JOIN user_forms uf ON l.form_id = uf.form_id WHERE uf.user_id = $1) as total_leads,
          (SELECT COUNT(*) FROM leads l JOIN user_forms uf ON l.form_id = uf.form_id WHERE uf.user_id = $1 AND l.created_at >= NOW() - INTERVAL '1 day') as leads_today,
          (SELECT COUNT(*) FROM leads l JOIN user_forms uf ON l.form_id = uf.form_id WHERE uf.user_id = $1 AND l.created_at >= NOW() - INTERVAL '7 days') as leads_this_week,
          (SELECT COUNT(*) FROM leads l JOIN user_forms uf ON l.form_id = uf.form_id WHERE uf.user_id = $1 AND l.created_at >= NOW() - INTERVAL '30 days') as leads_this_month
      `;
      params.push(userId);
    }

    const result = await pool.query(statsQuery, params);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        total_forms: parseInt(stats.total_forms || 0),
        active_forms: parseInt(stats.active_forms || 0),
        total_leads: parseInt(stats.total_leads || 0),
        leads_today: parseInt(stats.leads_today || 0),
        leads_this_week: parseInt(stats.leads_this_week || 0),
        leads_this_month: parseInt(stats.leads_this_month || 0),
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
