const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware
router.use(authMiddleware);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM forms) as total_forms,
        (SELECT COUNT(*) FROM forms WHERE is_active = true) as active_forms,
        (SELECT COUNT(*) FROM leads) as total_leads,
        (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '1 day') as leads_today,
        (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '7 days') as leads_this_week,
        (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '30 days') as leads_this_month
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        total_forms: parseInt(stats.total_forms),
        active_forms: parseInt(stats.active_forms),
        total_leads: parseInt(stats.total_leads),
        leads_today: parseInt(stats.leads_today),
        leads_this_week: parseInt(stats.leads_this_week),
        leads_this_month: parseInt(stats.leads_this_month),
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar estatísticas' });
  }
});

module.exports = router;
