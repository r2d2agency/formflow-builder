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
    const { name, api_url, api_key, default_number, is_active } = req.body;

    const result = await pool.query(
      `INSERT INTO evolution_instances (name, api_url, api_key, default_number, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, api_url, api_key, default_number, is_active ?? true]
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
    const { name, api_url, api_key, default_number, is_active } = req.body;

    const result = await pool.query(
      `UPDATE evolution_instances 
       SET name = $1, api_url = $2, api_key = $3, default_number = $4, is_active = $5
       WHERE id = $6
       RETURNING *`,
      [name, api_url, api_key, default_number, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update evolution instance error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao atualizar instância: ' + (error.message || 'Erro desconhecido') 
    });
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

    console.log('[Evolution] Starting connection test...');
    console.log('[Evolution] URL:', effectiveUrl);
    console.log('[Evolution] Instance Name:', instance.name);

    // Array of endpoints to try to validate connection
    const attempts = [
      {
        name: 'Fetch Instances (Global Key Check)',
        url: `${effectiveUrl}/instance/fetchInstances`,
        method: 'GET'
      },
      {
        name: 'Connect Instance (Instance Key Check)',
        url: `${effectiveUrl}/instance/connect/${instance.name}`,
        method: 'GET'
      },
      {
        name: 'Connection State',
        url: `${effectiveUrl}/instance/connectionState/${instance.name}`,
        method: 'GET'
      }
    ];

    let success = false;
    let lastError = null;
    let successDetails = null;

    for (const attempt of attempts) {
      try {
        console.log(`[Evolution] Trying: ${attempt.name} -> ${attempt.url}`);
        const response = await fetch(attempt.url, {
          method: attempt.method,
          headers: {
            'apikey': instance.api_key,
            'Content-Type': 'application/json'
          },
        });

        const data = await response.json().catch(() => null); // Handle non-JSON responses gracefully
        console.log(`[Evolution] Response Status: ${response.status}`);
        
        if (response.ok) {
          success = true;
          successDetails = {
            method: attempt.name,
            status: response.status,
            data: data
          };
          console.log('[Evolution] Success!');
          break; // Stop on first success
        } else {
          lastError = data || { status: response.status, statusText: response.statusText };
          console.log('[Evolution] Failed:', lastError);
        }
      } catch (err) {
        console.error(`[Evolution] Error on ${attempt.name}:`, err.message);
        lastError = { message: err.message, code: err.cause?.code };
      }
    }

    if (success) {
      res.json({ 
        success: true, 
        message: 'Conexão estabelecida com sucesso',
        details: successDetails,
        used_url: effectiveUrl,
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Falha ao conectar com a Evolution API. Verifique URL e Chave.',
        details: lastError,
        used_url: effectiveUrl
      });
    }

  } catch (error) {
    console.error('Test evolution instance error:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao testar instância' });
  }
});

// POST /api/evolution-instances/:id/send-test
router.post('/:id/send-test', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { phone, message, type = 'text', media_url, filename } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });
    }

    if (type === 'text' && !message) {
      return res.status(400).json({ success: false, error: 'Mensagem é obrigatória para envio de texto' });
    }

    if (type !== 'text' && !media_url) {
      return res.status(400).json({ success: false, error: 'URL da mídia é obrigatória' });
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

    const encodedName = encodeURIComponent(instance.name);

    let endpoint;
    let payload;

    if (type === 'text') {
      endpoint = `${effectiveUrl}/message/sendText/${encodedName}`;
      payload = {
        number: cleanPhone,
        textMessage: { text: message },
        options: { delay: 1200, presence: "composing" }
      };
    } else if (type === 'audio') {
      endpoint = `${effectiveUrl}/message/sendWhatsAppAudio/${encodedName}`;
      payload = {
        number: cleanPhone,
        audio: media_url,
        options: { delay: 1200, presence: "recording" }
      };
    } else {
      // image, video, document
      endpoint = `${effectiveUrl}/message/sendMedia/${encodedName}`;
      payload = {
        number: cleanPhone,
        mediatype: type === 'document' ? 'document' : type,
        media: media_url,
        fileName: filename || 'file',
        caption: message || '', // Optional caption
        options: { delay: 1200, presence: "composing" }
      };
    }

    console.log('[Evolution] Sending test message...');
    console.log('[Evolution] Type:', type);
    console.log('[Evolution] Endpoint:', endpoint);
    console.log('[Evolution] Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.api_key,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { error: 'Non-JSON response', body: responseText };
      }

      console.log(`[Evolution] Response Status: ${response.status}`);
      console.log('[Evolution] Response Body:', data);

      if (response.ok) {
        res.json({ 
          success: true, 
          message: 'Mensagem enviada com sucesso', 
          data, 
          used_url: endpoint 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: data.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || 'Erro retornado pela Evolution API',
          details: data
        });
      }
    } catch (fetchError) {
      console.error('[Evolution] Fetch error:', fetchError);
      res.status(400).json({ 
        success: false, 
        error: 'Não foi possível conectar à Evolution API para envio: ' + fetchError.message,
        details: {
          code: fetchError.cause?.code || null,
          message: fetchError.message,
          used_url: endpoint,
        },
      });
    }
  } catch (error) {
    console.error('Send test message error:', error);
    res.status(500).json({ success: false, error: 'Erro ao enviar mensagem de teste' });
  }
});

module.exports = router;
