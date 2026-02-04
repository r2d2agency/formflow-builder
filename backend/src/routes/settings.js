const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - Get all system settings (public for branding)
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT key, value FROM system_settings');
    
    // Convert to object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[settings] Get settings error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar configurações' });
  }
});

// PUT /api/settings - Update system settings (admin only)
router.put('/', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
    }

    const pool = req.app.locals.pool;
    const settings = req.body;

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO system_settings (key, value, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
    }

    // Return updated settings
    const result = await pool.query('SELECT key, value FROM system_settings');
    const updatedSettings = {};
    result.rows.forEach(row => {
      updatedSettings[row.key] = row.value;
    });

    res.json({ success: true, data: updatedSettings, message: 'Configurações atualizadas' });
  } catch (error) {
    console.error('[settings] Update settings error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar configurações' });
  }
});

// POST /api/settings/upload-logo - Upload logo (admin only)
router.post('/upload-logo', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
    }

    const { logo_base64 } = req.body;
    
    if (!logo_base64) {
      return res.status(400).json({ success: false, error: 'Logo é obrigatório' });
    }

    // For now, store as base64 data URL (later we'll use proper storage)
    // This is temporary until MinIO/S3 is configured
    const pool = req.app.locals.pool;
    await pool.query(
      `INSERT INTO system_settings (key, value, updated_at) 
       VALUES ('system_logo_url', $1, NOW()) 
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [logo_base64]
    );

    res.json({ success: true, data: { logo_url: logo_base64 }, message: 'Logo atualizado' });
  } catch (error) {
    console.error('[settings] Upload logo error:', error);
    res.status(500).json({ success: false, error: 'Erro ao fazer upload do logo' });
  }
});

module.exports = router;
