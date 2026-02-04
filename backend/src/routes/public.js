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
      console.log('WhatsApp notification enabled, instance:', settings.evolution_instance_id);
      try {
        // Get Evolution instance
        const instanceResult = await pool.query(
          'SELECT * FROM evolution_instances WHERE id = $1 AND is_active = true',
          [settings.evolution_instance_id]
        );

        console.log('Instance found:', instanceResult.rows.length > 0);

        if (instanceResult.rows.length > 0) {
          const instance = instanceResult.rows[0];
          
          // Format message - use custom message or default
          let message = settings.whatsapp_message || '🎉 Novo lead!\n\nFormulário: {{form_name}}\n\n{{dados}}';
          
          // Replace variables
          message = message.replace(/\{\{form_name\}\}/g, form.name);
          message = message.replace(/\{\{formulario\}\}/g, form.name);
          
          // Replace field variables
          for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
            message = message.replace(regex, String(value || ''));
          }
          
          // Replace {{dados}} with all data entries
          const dataEntries = Object.entries(data)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');
          message = message.replace(/\{\{dados\}\}/g, dataEntries);

          // Determine target number (use settings override or instance default)
          const targetNumber = settings.whatsapp_target_number || instance.default_number;
          
          if (!targetNumber) {
            console.error('No target phone number configured');
          } else {
            console.log('Sending WhatsApp to:', targetNumber);
            console.log('API URL:', `${instance.api_url}/message/sendText/${instance.name}`);
            
            // Send via Evolution API
            const response = await fetch(`${instance.api_url}/message/sendText/${instance.name}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': instance.api_key,
              },
              body: JSON.stringify({
                number: targetNumber.replace(/\D/g, ''),
                textMessage: { text: message },
              }),
            });

            const responseData = await response.json();
            console.log('Evolution API response:', response.status, responseData);
            
            if (!response.ok) {
              console.error('Evolution API error:', responseData);
            }
          }
        }
      } catch (whatsappError) {
        console.error('WhatsApp notification error:', whatsappError);
      }
    } else {
      console.log('WhatsApp notification not enabled or no instance configured');
      console.log('settings.whatsapp_notification:', settings.whatsapp_notification);
      console.log('settings.evolution_instance_id:', settings.evolution_instance_id);
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
