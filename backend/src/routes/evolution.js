const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper to normalize API URL (remove trailing slash)
const normalizeUrl = (url) => url ? url.replace(/\/+$/, '') : '';

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/evolution-instances
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM evolution_instances ORDER BY created_at DESC');

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get evolution instances error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar instâncias' });
  }
});

// GET /api/evolution-instances/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT * FROM evolution_instances WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get evolution instance error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar instância' });
  }
});

// POST /api/evolution-instances
router.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { name, api_url, internal_api_url, api_key, default_number, is_active } = req.body;

    const result = await pool.query(
      `INSERT INTO evolution_instances (name, api_url, internal_api_url, api_key, default_number, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, api_url, internal_api_url || null, api_key, default_number, is_active ?? true]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create evolution instance error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar instância' });
  }
});

// PUT /api/evolution-instances/:id
router.put('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { name, api_url, internal_api_url, api_key, default_number, is_active } = req.body;

    const result = await pool.query(
      `UPDATE evolution_instances 
       SET name = $1, api_url = $2, internal_api_url = $3, api_key = $4, default_number = $5, is_active = $6
       WHERE id = $7
       RETURNING *`,
      [name, api_url, internal_api_url || null, api_key, default_number, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update evolution instance error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar instância' });
  }
});

// DELETE /api/evolution-instances/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'DELETE FROM evolution_instances WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    res.json({ success: true, message: 'Instância excluída com sucesso' });
  } catch (error) {
    console.error('Delete evolution instance error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir instância' });
  }
});

// Helper to get the effective API URL (internal if available, otherwise public)
const getEffectiveApiUrl = (instance) => {
  return normalizeUrl(instance.internal_api_url || instance.api_url);
};

// POST /api/evolution-instances/:id/test
router.post('/:id/test', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT * FROM evolution_instances WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    const instance = result.rows[0];
    const effectiveUrl = getEffectiveApiUrl(instance);

    // Test connection to Evolution API
    try {
      console.log('[Evolution] Testing connection to:', effectiveUrl);
      const response = await fetch(`${effectiveUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': instance.api_key,
        },
      });

      if (response.ok) {
        res.json({ 
          success: true, 
          message: 'Conexão estabelecida com sucesso',
          used_url: effectiveUrl,
        });
      } else {
        res.status(400).json({ success: false, error: 'Falha na conexão com Evolution API' });
      }
    } catch (fetchError) {
      console.error('[Evolution] Test error:', fetchError.cause || fetchError.message);
      res.status(400).json({ 
        success: false, 
        error: 'Não foi possível conectar à Evolution API',
        details: {
          code: fetchError.cause?.code || null,
          message: fetchError.message,
          used_url: effectiveUrl,
        },
      });
    }
  } catch (error) {
    console.error('Test evolution instance error:', error);
    res.status(500).json({ success: false, error: 'Erro ao testar instância' });
  }
});

// POST /api/evolution-instances/:id/send-test
router.post('/:id/send-test', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Telefone e mensagem são obrigatórios' });
    }

    const result = await pool.query(
      'SELECT * FROM evolution_instances WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    const instance = result.rows[0];
    const effectiveUrl = getEffectiveApiUrl(instance);

    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');

    try {
      console.log('[Evolution] Sending message via:', effectiveUrl);
      const response = await fetch(`${effectiveUrl}/message/sendText/${instance.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.api_key,
        },
        body: JSON.stringify({
          number: cleanPhone,
          textMessage: { text: message },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        res.json({ success: true, message: 'Mensagem enviada com sucesso', data, used_url: effectiveUrl });
      } else {
        console.error('Evolution API error:', data);
        res.status(400).json({ success: false, error: data.message || 'Erro ao enviar mensagem' });
      }
    } catch (fetchError) {
      console.error('Evolution fetch error:', fetchError.cause || fetchError.message);
      res.status(400).json({ 
        success: false, 
        error: 'Não foi possível conectar à Evolution API',
        details: {
          code: fetchError.cause?.code || null,
          message: fetchError.message,
          used_url: effectiveUrl,
        },
      });
    }
  } catch (error) {
    console.error('Send test message error:', error);
    res.status(500).json({ success: false, error: 'Erro ao enviar mensagem de teste' });
  }
});

module.exports = router;
