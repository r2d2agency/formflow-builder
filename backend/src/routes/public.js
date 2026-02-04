const express = require('express');

const router = express.Router();

// POST /api/public/forms/:slug/submit
router.post('/forms/:slug/submit', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { slug } = req.params;
    const { data } = req.body;

    // Get form by slug
    const formResult = await pool.query(
      'SELECT * FROM forms WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (formResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
    }

    const form = formResult.rows[0];

    // Get IP and User Agent
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const source = req.query.source || 'organic';

    // Create lead
    const leadResult = await pool.query(
      `INSERT INTO leads (form_id, data, source, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [form.id, JSON.stringify(data), source, ipAddress, userAgent]
    );

    const lead = leadResult.rows[0];
    const settings = form.settings || {};

    // Send webhook if enabled
    if (settings.webhook_enabled && settings.webhook_url) {
      try {
        await fetch(settings.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            form_id: form.id,
            form_name: form.name,
            form_slug: form.slug,
            lead_id: lead.id,
            data,
            submitted_at: lead.created_at,
            source,
            ip_address: ipAddress,
            user_agent: userAgent,
          }),
        });
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }
    }

    // Send WhatsApp notification if enabled
    if (settings.whatsapp_notification && settings.evolution_instance_id) {
      try {
        // Get Evolution instance
        const instanceResult = await pool.query(
          'SELECT * FROM evolution_instances WHERE id = $1 AND is_active = true',
          [settings.evolution_instance_id]
        );

        if (instanceResult.rows.length > 0) {
          const instance = instanceResult.rows[0];
          
          // Format message
          const dataEntries = Object.entries(data)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          
          const message = `🎉 Novo lead!\n\nFormulário: ${form.name}\n\n${dataEntries}`;

          // Send via Evolution API
          await fetch(`${instance.api_url}/message/sendText/${instance.name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instance.api_key,
            },
            body: JSON.stringify({
              number: instance.default_number,
              textMessage: { text: message },
            }),
          });
        }
      } catch (whatsappError) {
        console.error('WhatsApp notification error:', whatsappError);
      }
    }

    res.status(201).json({
      success: true,
      message: settings.success_message || 'Lead criado com sucesso',
      redirect_url: settings.redirect_url,
    });
  } catch (error) {
    console.error('Submit form error:', error);
    res.status(500).json({ success: false, error: 'Erro ao enviar formulário' });
  }
});

// GET /api/public/forms/:slug (for loading form on public page)
router.get('/forms/:slug', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT id, name, slug, description, type, fields, settings, is_active FROM forms WHERE slug = $1 AND is_active = true',
      [req.params.slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get public form error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar formulário' });
  }
});

module.exports = router;
