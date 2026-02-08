const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Helper to normalize API URL
const normalizeUrl = (url) => {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
};

// Helper to get effective URL
const getEffectiveApiUrl = (instance) => {
  // Always use the public/main API URL
  // (Internal URL logic removed as per request)
  return normalizeUrl(instance.api_url);
};

// Evolution API Service Wrapper
const createEvolutionService = (instance) => {
  const baseUrl = getEffectiveApiUrl(instance);
  const apiKey = instance.api_key;
  const instanceName = instance.name;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': apiKey,
    'Connection': 'close' // Important for some environments to prevent socket hang up
  };

  const _fetch = async (endpoint, options = {}) => {
    const url = `${baseUrl}${endpoint}`;
    console.log(`[Evolution] Request: ${options.method || 'GET'} ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { error: 'Non-JSON response', body: responseText };
      }

      if (!response.ok) {
        // Log detailed error from API if available
        console.warn(`[Evolution] API Error ${response.status}:`, data);
        const errorMessage = data.message || (typeof data.error === 'string' ? data.error : JSON.stringify(data.error)) || `HTTP Error ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      // Enhanced error logging
      const errorDetails = {
        message: error.message,
        cause: error.cause,
        code: error.code, // Node.js network error code (e.g. ECONNREFUSED)
        url: url
      };
      console.error(`[Evolution] Error requesting ${url}:`, JSON.stringify(errorDetails));
      
      // Enrich error object for callers
      error.details = errorDetails;
      
      // Translate common network errors
      if (error.cause && error.cause.code === 'ECONNREFUSED') {
        error.message = `Conexão recusada em ${baseUrl}. Verifique se a URL está correta e o servidor está rodando.`;
      } else if (error.cause && error.cause.code === 'ENOTFOUND') {
        error.message = `Não foi possível encontrar o servidor em ${baseUrl}. Verifique o DNS ou IP.`;
      } else if (error.message.includes('fetch failed')) {
         error.message = `Falha na conexão com ${baseUrl}. Verifique firewall, URL incorreta ou servidor offline. (Erro original: ${error.message})`;
      }

      throw error;
    }
  };

  return {
    checkConnection: async () => {
      // Try to get connection state
      return _fetch(`/instance/connectionState/${instanceName}`);
    },
    
    fetchInstance: async () => {
      // Try to fetch instance details (verifies global key or instance existence)
      return _fetch(`/instance/fetchInstances?instanceName=${instanceName}`);
    },

    connect: async () => {
      // Get QR Code or status
      return _fetch(`/instance/connect/${instanceName}`);
    },

    sendText: async (number, text) => {
      return _fetch(`/message/sendText/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number,
          text,
          delay: 1200,
          linkPreview: false
        })
      });
    },

    sendMedia: async (number, mediaUrl, mediaType, caption) => {
      // Evolution v2 endpoint for media
      return _fetch(`/message/sendMedia/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number,
          mediatype: mediaType,
          media: mediaUrl,
          caption: caption || '',
          delay: 1200
        })
      });
    },
    
    sendAudio: async (number, audioUrl) => {
      return _fetch(`/message/sendWhatsAppAudio/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number,
          audio: audioUrl,
          delay: 1200
        })
      });
    }
  };
};

// Apply auth middleware
router.use(authMiddleware);

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

router.use(adminOnly);

// GET /api/evolution-instances
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    // Filter by user_id
    const result = await pool.query(
      'SELECT * FROM evolution_instances WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
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
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM evolution_instances WHERE id = $1 AND user_id = $2', 
      [req.params.id, userId]
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

// GET /api/evolution-instances/:id/connect
// Returns connection status or QR Code
router.get('/:id/connect', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM evolution_instances WHERE id = $1 AND user_id = $2', 
      [req.params.id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    const instance = result.rows[0];
    const service = createEvolutionService(instance);

    try {
      const data = await service.connect();
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message, details: error });
    }
  } catch (error) {
    console.error('Connect evolution instance error:', error);
    res.status(500).json({ success: false, error: 'Erro ao conectar instância' });
  }
});

// POST /api/evolution-instances
router.post('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const { name, api_url, api_key, default_number, is_active } = req.body;

    // Basic validation
    if (!name || !api_url || !api_key) {
      return res.status(400).json({ success: false, error: 'Nome, URL e API Key são obrigatórios' });
    }

    const result = await pool.query(
      `INSERT INTO evolution_instances (name, api_url, api_key, default_number, is_active, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, normalizeUrl(api_url), api_key, default_number, is_active ?? true, userId]
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
    const userId = req.user.id;
    const { name, api_url, api_key, default_number, is_active } = req.body;

    const result = await pool.query(
      `UPDATE evolution_instances 
       SET name = $1, api_url = $2, api_key = $3, default_number = $4, is_active = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, normalizeUrl(api_url), api_key, default_number, is_active, req.params.id, userId]
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
    const userId = req.user.id;
    const result = await pool.query(
      'DELETE FROM evolution_instances WHERE id = $1 AND user_id = $2 RETURNING id', 
      [req.params.id, userId]
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

// POST /api/evolution-instances/:id/test
// Tests connection and returns status
router.post('/:id/test', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM evolution_instances WHERE id = $1 AND user_id = $2', 
      [req.params.id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Instância não encontrada' });
    }

    const instance = result.rows[0];
    const service = createEvolutionService(instance);

    console.log(`[Evolution] Testing connection for instance: ${instance.name}`);
    
    // Try to get connection state
    try {
      const state = await service.checkConnection();
      res.json({ 
        success: true, 
        message: 'Conexão estabelecida com sucesso',
        details: state
      });
    } catch (error) {
      // Fallback: try to fetch instance (maybe it's not connected but API is reachable)
      try {
        const info = await service.fetchInstance();
        res.json({
          success: true,
          message: 'API acessível, mas verifique o estado da conexão',
          details: info
        });
      } catch (innerError) {
        // Use the most relevant error message
        const finalError = innerError.message || error.message;
        res.status(400).json({
          success: false,
          error: `Falha ao conectar com a Evolution API: ${finalError}`,
          details: { 
             message: finalError,
             original_error: error.message,
             tech_details: innerError.details || error.details 
          }
        });
      }
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

    if (!phone) return res.status(400).json({ success: false, error: 'Telefone obrigatório' });
    
    const result = await pool.query('SELECT * FROM evolution_instances WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Instância não encontrada' });

    const instance = result.rows[0];
    const service = createEvolutionService(instance);
    const cleanPhone = phone.replace(/\D/g, '');

    console.log(`[Evolution] Sending ${type} to ${cleanPhone} via ${instance.name}`);

    let apiResponse;
    try {
      if (type === 'text') {
        if (!message) throw new Error('Mensagem obrigatória');
        apiResponse = await service.sendText(cleanPhone, message);
      } else if (type === 'audio') {
        if (!media_url) throw new Error('URL do áudio obrigatória');
        apiResponse = await service.sendAudio(cleanPhone, media_url);
      } else {
        // image, video, document
        if (!media_url) throw new Error('URL da mídia obrigatória');
        apiResponse = await service.sendMedia(cleanPhone, media_url, type === 'document' ? 'document' : type, message);
      }

      res.json({ success: true, message: 'Enviado com sucesso', data: apiResponse });
    } catch (error) {
      console.error('[Evolution] Send error:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message || 'Erro ao enviar mensagem',
        details: {
          message: error.message,
          tech_details: error.details
        }
      });
    }
  } catch (error) {
    console.error('Send test message error:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao enviar mensagem' });
  }
});

module.exports = router;
