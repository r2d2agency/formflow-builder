const express = require('express');
const router = express.Router();

// Helper to find field in data by common names
const findField = (data, searchTerms) => {
  const entry = Object.entries(data).find(([key]) =>
    searchTerms.some(term => key.toLowerCase().includes(term))
  );
  return entry ? entry[1] : null;
};

// Helper to log integration results
const logIntegration = async (pool, formId, leadId, type, status, payload, response, errorMessage = null) => {
  try {
    await pool.query(
      `INSERT INTO integration_logs (form_id, lead_id, integration_type, status, payload, response, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [formId, leadId, type, status, payload, response, errorMessage]
    );
  } catch (err) {
    console.error(`[API v1 Logs] Failed to save ${type} log:`, err.message);
  }
};

// POST /api/v1/forms/:slug/leads
// Public API endpoint for external systems to submit leads
router.post('/forms/:slug/leads', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { slug } = req.params;
    const { data, source, utm } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'O campo "data" é obrigatório e deve ser um objeto JSON com os dados do lead.',
      });
    }

    // Get form by slug
    const formResult = await pool.query(
      'SELECT * FROM forms WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado ou inativo.' });
    }

    const form = formResult.rows[0];
    const settings = form.settings || {};

    // Check if API is enabled
    if (!settings.api_enabled) {
      return res.status(403).json({
        success: false,
        error: 'API não está habilitada para este formulário. Ative nas configurações.',
      });
    }

    // Check API Key if configured
    if (settings.api_key) {
      const providedKey = req.headers['x-api-key'];
      if (!providedKey || providedKey !== settings.api_key) {
        return res.status(401).json({
          success: false,
          error: 'API Key inválida ou ausente. Envie no header X-API-Key.',
        });
      }
    }

    // Get IP and User Agent
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const leadSource = source || 'api';

    // Merge UTM data into lead data if provided
    const enrichedData = { ...data };
    if (utm && typeof utm === 'object') {
      enrichedData._utm = utm;
    }

    // Create lead
    const leadResult = await pool.query(
      `INSERT INTO leads (form_id, data, source, ip_address, user_agent, is_partial)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [form.id, JSON.stringify(enrichedData), leadSource, ipAddress, userAgent]
    );

    const lead = leadResult.rows[0];

    // Log API submission
    await logIntegration(pool, form.id, lead.id, 'api_v1', 'success', { data, source: leadSource, utm }, { lead_id: lead.id });

    console.log(`[API v1] Lead created for form ${slug}: ${lead.id}`);

    res.status(201).json({
      success: true,
      data: {
        lead_id: lead.id,
        form_id: form.id,
        created_at: lead.created_at,
      },
    });
  } catch (error) {
    console.error('[API v1] Error:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao processar lead.' });
  }
});

// GET /api/v1/forms/:slug - Get form info (public fields only)
router.get('/forms/:slug', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { slug } = req.params;

    const result = await pool.query(
      'SELECT id, name, slug, description, type, fields, is_active FROM forms WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado.' });
    }

    const form = result.rows[0];

    // Return only public-safe field info
    const publicFields = (form.fields || []).map(f => ({
      id: f.id,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder,
      required: f.required,
      options: f.options,
    }));

    res.json({
      success: true,
      data: {
        id: form.id,
        name: form.name,
        slug: form.slug,
        description: form.description,
        type: form.type,
        fields: publicFields,
      },
    });
  } catch (error) {
    console.error('[API v1] Error:', error);
    res.status(500).json({ success: false, error: 'Erro interno.' });
  }
});

module.exports = router;
