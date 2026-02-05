const express = require('express');

const router = express.Router();

// POST /api/public/forms/:slug/partial - Save partial lead data progressively
router.post('/forms/:slug/partial', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { slug } = req.params;
    const { data, partial_lead_id } = req.body;

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

    let lead;

    if (partial_lead_id) {
      // Update existing partial lead
      const updateResult = await pool.query(
        `UPDATE leads 
         SET data = $1, updated_at = NOW()
         WHERE id = $2 AND form_id = $3 AND is_partial = true
         RETURNING *`,
        [JSON.stringify(data), partial_lead_id, form.id]
      );

      if (updateResult.rows.length > 0) {
        lead = updateResult.rows[0];
        console.log('[PartialLead] Updated:', lead.id);
      } else {
        // Lead not found or already completed, create new
        const insertResult = await pool.query(
          `INSERT INTO leads (form_id, data, source, ip_address, user_agent, is_partial)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING *`,
          [form.id, JSON.stringify(data), source, ipAddress, userAgent]
        );
        lead = insertResult.rows[0];
        console.log('[PartialLead] Created new (old not found):', lead.id);
      }
    } else {
      // Create new partial lead
      const insertResult = await pool.query(
        `INSERT INTO leads (form_id, data, source, ip_address, user_agent, is_partial)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [form.id, JSON.stringify(data), source, ipAddress, userAgent]
      );
      lead = insertResult.rows[0];
      console.log('[PartialLead] Created:', lead.id);
    }

    res.status(200).json({
      success: true,
      data: { lead_id: lead.id },
    });
  } catch (error) {
    console.error('Partial lead error:', error);
    res.status(500).json({ success: false, error: 'Erro ao salvar dados parciais' });
  }
});

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

    // Check if we have a partial lead to complete
    const partialLeadId = req.body.partial_lead_id;
    let lead;

    if (partialLeadId) {
      // Complete the partial lead
      const updateResult = await pool.query(
        `UPDATE leads 
         SET data = $1, is_partial = false, updated_at = NOW()
         WHERE id = $2 AND form_id = $3
         RETURNING *`,
        [JSON.stringify(data), partialLeadId, form.id]
      );
      
      if (updateResult.rows.length > 0) {
        lead = updateResult.rows[0];
        console.log('[Lead] Completed partial lead:', lead.id);
      } else {
        // Partial lead not found, create new
        const insertResult = await pool.query(
          `INSERT INTO leads (form_id, data, source, ip_address, user_agent, is_partial)
           VALUES ($1, $2, $3, $4, $5, false)
           RETURNING *`,
          [form.id, JSON.stringify(data), source, ipAddress, userAgent]
        );
        lead = insertResult.rows[0];
      }
    } else {
      // Create new complete lead
      const leadResult = await pool.query(
        `INSERT INTO leads (form_id, data, source, ip_address, user_agent, is_partial)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [form.id, JSON.stringify(data), source, ipAddress, userAgent]
      );
      lead = leadResult.rows[0];
    }
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
      console.log('[WhatsApp] Notification enabled, instance:', settings.evolution_instance_id);
      try {
        // Get Evolution instance
        const instanceResult = await pool.query(
          'SELECT * FROM evolution_instances WHERE id = $1 AND is_active = true',
          [settings.evolution_instance_id]
        );

        console.log('[WhatsApp] Instance found:', instanceResult.rows.length > 0);

        if (instanceResult.rows.length > 0) {
          const instance = instanceResult.rows[0];
          
          // Determine target number (use settings override or instance default)
          const targetNumber = settings.whatsapp_target_number || instance.default_number;
          
          if (!targetNumber) {
            console.error('[WhatsApp] No target phone number configured');
          } else {
            const cleanNumber = targetNumber.replace(/\D/g, '');
            console.log('[WhatsApp] Sending to:', cleanNumber);
            console.log('[WhatsApp] API URL:', instance.api_url);
            console.log('[WhatsApp] Instance name:', instance.name);
            
            // Check if whatsapp_message is the new format (object with items) or old format (string)
            const whatsappMessage = settings.whatsapp_message;
            
            if (whatsappMessage && whatsappMessage.items && Array.isArray(whatsappMessage.items)) {
              // New format: send multiple messages with delay
              const delaySeconds = whatsappMessage.delay_seconds || 2;
              
              for (let i = 0; i < whatsappMessage.items.length; i++) {
                const item = whatsappMessage.items[i];
                
                // Wait delay between messages (except first)
                if (i > 0) {
                  await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                }
                
                let apiEndpoint;
                let body;
                
                if (item.type === 'text') {
                  // Replace variables in text
                  let text = item.content || '';
                  text = text.replace(/\{\{form_name\}\}/g, form.name);
                  text = text.replace(/\{\{formulario\}\}/g, form.name);
                  
                  for (const [key, value] of Object.entries(data)) {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
                    text = text.replace(regex, String(value || ''));
                  }
                  
                  const dataEntries = Object.entries(data)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
                  text = text.replace(/\{\{dados\}\}/g, dataEntries);
                  
                  apiEndpoint = `${instance.api_url}/message/sendText/${instance.name}`;
                  body = { number: cleanNumber, textMessage: { text } };
                  
                } else if (item.type === 'audio') {
                  apiEndpoint = `${instance.api_url}/message/sendWhatsAppAudio/${instance.name}`;
                  body = { number: cleanNumber, audio: item.content };
                  
                } else if (item.type === 'video' || item.type === 'document') {
                  apiEndpoint = `${instance.api_url}/message/sendMedia/${instance.name}`;
                  body = {
                    number: cleanNumber,
                    mediatype: item.type === 'video' ? 'video' : 'document',
                    media: item.content,
                    fileName: item.filename || 'file',
                  };
                }
                
                if (apiEndpoint && body) {
                  console.log(`[WhatsApp] Sending ${item.type} message...`);
                  const response = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': instance.api_key,
                    },
                    body: JSON.stringify(body),
                  });
                  
                  const responseData = await response.json();
                  console.log(`[WhatsApp] ${item.type} response:`, response.status, responseData?.key?.id || responseData?.message || 'OK');
                  
                  if (!response.ok) {
                    console.error(`[WhatsApp] ${item.type} error:`, responseData);
                  }
                }
              }
            } else {
              // Old format or default: simple text message
              let message = (typeof whatsappMessage === 'string' ? whatsappMessage : null) 
                || '🎉 Novo lead!\n\nFormulário: {{form_name}}\n\n{{dados}}';
              
              message = message.replace(/\{\{form_name\}\}/g, form.name);
              message = message.replace(/\{\{formulario\}\}/g, form.name);
              
              for (const [key, value] of Object.entries(data)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
                message = message.replace(regex, String(value || ''));
              }
              
              const dataEntries = Object.entries(data)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
              message = message.replace(/\{\{dados\}\}/g, dataEntries);
              
              console.log('[WhatsApp] Sending simple text message...');
              const response = await fetch(`${instance.api_url}/message/sendText/${instance.name}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': instance.api_key,
                },
                body: JSON.stringify({
                  number: cleanNumber,
                  textMessage: { text: message },
                }),
              });

              const responseData = await response.json();
              console.log('[WhatsApp] Response:', response.status, responseData?.key?.id || responseData?.message || 'OK');
              
              if (!response.ok) {
                console.error('[WhatsApp] Error:', responseData);
              }
            }
          }
        }
      } catch (whatsappError) {
        console.error('[WhatsApp] Notification error:', whatsappError);
      }
    } else {
      console.log('[WhatsApp] Notification not enabled or no instance configured');
      console.log('[WhatsApp] whatsapp_notification:', settings.whatsapp_notification);
      console.log('[WhatsApp] evolution_instance_id:', settings.evolution_instance_id);
    }

    // Send Facebook Conversions API event if configured
    if (settings.facebook_pixel && settings.facebook_pixel_access_token) {
      console.log('[Facebook] Pixel configured:', settings.facebook_pixel);
      try {
        // Build user data for matching
        const userData = {};
        
        // Try to find email in submitted data
        const emailField = Object.entries(data).find(([key]) => 
          key.toLowerCase().includes('email')
        );
        if (emailField) {
          // Hash email (Facebook requires SHA256, but we'll send unhashed and let FB hash it)
          userData.em = [String(emailField[1]).toLowerCase().trim()];
        }
        
        // Try to find phone in submitted data
        const phoneField = Object.entries(data).find(([key]) => 
          key.toLowerCase().includes('phone') || 
          key.toLowerCase().includes('whatsapp') || 
          key.toLowerCase().includes('telefone') ||
          key.toLowerCase().includes('celular')
        );
        if (phoneField) {
          // Clean phone number
          const cleanPhone = String(phoneField[1]).replace(/\D/g, '');
          userData.ph = [cleanPhone];
        }
        
        // Try to find name in submitted data
        const nameField = Object.entries(data).find(([key]) => 
          key.toLowerCase().includes('nome') || 
          key.toLowerCase().includes('name')
        );
        if (nameField) {
          const nameParts = String(nameField[1]).trim().split(' ');
          if (nameParts[0]) userData.fn = [nameParts[0].toLowerCase()];
          if (nameParts.length > 1) userData.ln = [nameParts[nameParts.length - 1].toLowerCase()];
        }
        
        // Add client info
        userData.client_ip_address = ipAddress;
        userData.client_user_agent = userAgent;
        
        const eventData = {
          data: [{
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: `${req.headers.origin || req.headers.referer || ''}/f/${slug}`,
            user_data: userData,
            custom_data: {
              form_name: form.name,
              form_slug: form.slug,
              lead_id: lead.id,
            },
          }],
        };
        
        // Add test_event_code if configured (for testing)
        if (settings.facebook_pixel_test_code) {
          eventData.test_event_code = settings.facebook_pixel_test_code;
        }
        
        const fbApiUrl = `https://graph.facebook.com/v18.0/${settings.facebook_pixel}/events?access_token=${settings.facebook_pixel_access_token}`;
        
        console.log('[Facebook] Sending Lead event...');
        const fbResponse = await fetch(fbApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
        
        const fbData = await fbResponse.json();
        console.log('[Facebook] Response:', fbResponse.status, fbData);
        
        if (!fbResponse.ok) {
          console.error('[Facebook] Error:', fbData.error || fbData);
        }
      } catch (fbError) {
        console.error('[Facebook] Conversions API error:', fbError.message);
      }
    } else {
      if (settings.facebook_pixel) {
        console.log('[Facebook] Pixel configured but missing access token');
      }
    }

    // Send Google Analytics event if configured
    // Note: GA4 Measurement Protocol would go here if needed

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
