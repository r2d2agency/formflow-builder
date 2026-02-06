const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// Helper to normalize API URL (remove trailing slash)
const normalizeUrl = (url) => url ? url.replace(/\/+$/, '') : '';

// Helper to get the effective API URL
const getEffectiveApiUrl = (instance) => {
  return normalizeUrl(instance.api_url);
};

// Helper to hash data for Facebook CAPI (SHA256)
const hashData = (data) => {
  if (!data) return null;
  return crypto.createHash('sha256').update(data).digest('hex');
};

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
    // Ensure payload/response are objects before stringifying if needed, 
    // but pg client handles objects for JSONB columns automatically if not stringified.
    // However, to be safe and consistent with current code style:
    await pool.query(
      `INSERT INTO integration_logs (form_id, lead_id, integration_type, status, payload, response, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [formId, leadId, type, status, payload, response, errorMessage]
    );
  } catch (err) {
    console.error(`[Logs] Failed to save ${type} log:`, err.message);
  }
};

// Async function to process integrations (Fire and Forget)
const processIntegrations = async (form, lead, data, ipAddress, userAgent, reqOrigin, pool) => {
  const settings = form.settings || {};
  console.log(`[Integrations] Processing for form ${form.slug} (ID: ${form.id}). Enabled: Webhook=${!!settings.webhook_enabled}, WA=${!!settings.whatsapp_notification}, FB=${!!settings.facebook_pixel}, RD=${!!settings.rdstation_enabled}`);
  const integrations = [];

  // 1. Webhook
  if (settings.webhook_enabled) {
    if (!settings.webhook_url) {
      console.warn('[Webhook] Enabled but URL missing');
      await logIntegration(pool, form.id, lead.id, 'webhook', 'error', {}, null, 'Webhook ativado mas URL não configurada');
    } else {
      integrations.push((async () => {
        const payload = {
          form_id: form.id,
          form_name: form.name,
          form_slug: form.slug,
          lead_id: lead.id,
          data,
          submitted_at: lead.created_at,
          source: lead.source,
          ip_address: ipAddress,
          user_agent: userAgent,
        };
        try {
          console.log('[Webhook] Sending...');
          const response = await fetch(settings.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          let responseData = null;
          try { responseData = await response.text(); } catch (e) {}
          
          if (response.ok) {
             console.log('[Webhook] Sent successfully');
             await logIntegration(pool, form.id, lead.id, 'webhook', 'success', payload, { status: response.status, body: responseData });
          } else {
             throw new Error(`HTTP ${response.status}: ${responseData}`);
          }
        } catch (error) {
          console.error('[Webhook] Error:', error.message);
          await logIntegration(pool, form.id, lead.id, 'webhook', 'error', payload, null, error.message);
        }
      })());
    }
  }

  // 2. WhatsApp Notification (Admin & Client)
  if (settings.whatsapp_notification) {
    if (!settings.evolution_instance_id) {
      console.warn('[WhatsApp] Enabled but Instance ID missing');
      await logIntegration(pool, form.id, lead.id, 'whatsapp_global', 'error', {}, null, 'WhatsApp ativado mas instância não selecionada');
    } else {
      integrations.push((async () => {
        try {
          const instanceResult = await pool.query(
            'SELECT * FROM evolution_instances WHERE id = $1 AND is_active = true',
            [settings.evolution_instance_id]
          );

          if (instanceResult.rows.length === 0) {
            console.log('[WhatsApp] Instance not found or inactive');
            await logIntegration(pool, form.id, lead.id, 'whatsapp_global', 'error', {}, null, 'Instância Evolution API não encontrada ou inativa');
            return;
          }

          const instance = instanceResult.rows[0];
          const effectiveUrl = getEffectiveApiUrl(instance);
          
          // --- Send to Admin ---
          // DISABLED per user request: "nao vamos notificar outra pessoa. por enquanto"
          /*
          const targetNumber = settings.whatsapp_target_number || instance.default_number;
          if (targetNumber) {
            const cleanNumber = targetNumber.replace(/\D/g, '');
            console.log(`[WhatsApp] Sending Admin notification to ${cleanNumber}`);
            
            let message = settings.whatsapp_message || '🎉 Novo lead!\n\nFormulário: {{form_name}}\n\n{{dados}}';
            if (typeof message === 'string') {
               // Replace variables
              message = message.replace(/\{\{form_name\}\}/g, form.name);
              message = message.replace(/\{\{formulario\}\}/g, form.name);
              for (const [key, value] of Object.entries(data)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
                message = message.replace(regex, String(value || ''));
              }
              const dataEntries = Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n');
              message = message.replace(/\{\{dados\}\}/g, dataEntries);

              const adminPayload = {
                number: cleanNumber,
                text: message,
                delay: 1200,
                linkPreview: false
              };

              try {
                const res = await fetch(`${effectiveUrl}/message/sendText/${instance.name}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': instance.api_key,
                  },
                  body: JSON.stringify(adminPayload),
                });
                const resData = await res.json().catch(() => ({}));
                if (res.ok) {
                  console.log(`[WhatsApp] Admin notification sent to ${cleanNumber}`);
                  await logIntegration(pool, form.id, lead.id, 'whatsapp_admin', 'success', adminPayload, resData);
                } else {
                  throw new Error(resData.message || JSON.stringify(resData) || `HTTP ${res.status}`);
                }
              } catch (err) {
                console.error(`[WhatsApp] Admin send error:`, err.message);
                await logIntegration(pool, form.id, lead.id, 'whatsapp_admin', 'error', adminPayload, null, err.message);
              }
            }
          } else {
             // Log warning if no target number for admin
             if (!settings.whatsapp_lead_notification) {
                 await logIntegration(pool, form.id, lead.id, 'whatsapp_admin', 'error', {}, null, 'Nenhum número de destino configurado para notificação admin');
             }
          }
          */

          // --- Send to Client (Lead) ---
          // Try to find client phone
          const clientPhone = findField(data, ['phone', 'whatsapp', 'telefone', 'celular', 'mobile']);
          
          // Force send to client if phone exists, ignoring whatsapp_lead_notification flag if global WA is enabled
          if (clientPhone) {
            const cleanClientPhone = String(clientPhone).replace(/\D/g, '');
            // Basic validation for Brazilian numbers (at least 10 digits: DDD + Number)
            if (cleanClientPhone.length >= 10) {
               console.log(`[WhatsApp] Sending Client notification to ${cleanClientPhone}`);
               
               // Prepare items to send (support both simple string and structured message)
               let itemsToSend = [];
               let rawMessage = settings.whatsapp_lead_message || settings.whatsapp_message || 'Olá! Recebemos seus dados. Entraremos em contato em breve.';
               
               if (typeof rawMessage === 'string') {
                   itemsToSend.push({ type: 'text', content: rawMessage });
               } else if (typeof rawMessage === 'object' && rawMessage !== null) {
                   if (Array.isArray(rawMessage.items)) {
                       itemsToSend = rawMessage.items;
                   } else {
                       // Fallback for unknown object structure - try to use string representation
                       // But check if it looks like the user input "[object Object]"
                       try {
                           const stringMsg = JSON.stringify(rawMessage);
                           // If it's just {} or similar, fallback to default text
                           if (stringMsg === '{}' || stringMsg === '[]') {
                               itemsToSend.push({ type: 'text', content: 'Olá! Recebemos seus dados.' });
                           } else {
                               itemsToSend.push({ type: 'text', content: String(rawMessage) }); // Will likely be [object Object] if not handled, but we try.
                           }
                       } catch (e) {
                           itemsToSend.push({ type: 'text', content: 'Olá! Recebemos seus dados.' });
                       }
                   }
               }

               // Helper to replace variables
               const replaceVariables = (text) => {
                   if (!text) return '';
                   let processed = String(text);
                   processed = processed.replace(/\{\{form_name\}\}/g, form.name);
                   processed = processed.replace(/\{\{name\}\}/g, findField(data, ['nome', 'name']) || '');
                   
                   for (const [key, value] of Object.entries(data)) {
                     const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
                     processed = processed.replace(regex, String(value || ''));
                   }
                   return processed;
               };

               // Send items sequentially
               for (const [index, item] of itemsToSend.entries()) {
                   try {
                       // Add delay between messages (start with configured delay, then 2s between items)
                       const delay = index === 0 ? 2000 : 2000; 
                       
                       let endpoint = '/message/sendText';
                       let payload = {
                           number: cleanClientPhone,
                           delay: delay,
                           linkPreview: false
                       };

                       // Process content based on type
                       if (item.type === 'text') {
                           endpoint = '/message/sendText';
                           payload.text = replaceVariables(item.content);
                       } else if (item.type === 'audio') {
                           endpoint = '/message/sendWhatsAppAudio';
                           payload.audio = item.content; // URL
                       } else if (item.type === 'video' || item.type === 'document' || item.type === 'image') {
                           endpoint = '/message/sendMedia';
                           payload.mediatype = item.type;
                           payload.media = item.content; // URL
                           if (item.filename) payload.fileName = item.filename;
                           if (item.mimeType) payload.mimetype = item.mimeType;
                           // Some integrations allow caption for media
                           // payload.caption = replaceVariables(item.caption || ''); 
                       } else {
                           // Fallback to text if unknown type
                           endpoint = '/message/sendText';
                           payload.text = replaceVariables(String(item.content || ''));
                       }

                       // Send request
                       console.log(`[WhatsApp] Sending item ${index + 1}/${itemsToSend.length} (${item.type}) to ${cleanClientPhone}`);
                       
                       const res = await fetch(`${effectiveUrl}${endpoint}/${instance.name}`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': instance.api_key,
                            },
                            body: JSON.stringify(payload),
                        });
                        
                        const resData = await res.json().catch(() => ({}));
                        
                        if (res.ok) {
                             await logIntegration(pool, form.id, lead.id, 'whatsapp_lead', 'success', payload, resData);
                        } else {
                             console.error(`[WhatsApp] Item ${index + 1} failed:`, resData);
                             await logIntegration(pool, form.id, lead.id, 'whatsapp_lead', 'error', payload, resData, resData.message || 'Error sending item');
                        }
                        
                        // Wait a bit before next message if not last
                        if (index < itemsToSend.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }

                   } catch (err) {
                      console.error(`[WhatsApp] Item ${index + 1} error:`, err.message);
                      await logIntegration(pool, form.id, lead.id, 'whatsapp_lead', 'error', { item_index: index, type: item.type }, null, err.message);
                   }
               }
            } else {
                await logIntegration(pool, form.id, lead.id, 'whatsapp_lead', 'error', { phone: clientPhone }, null, 'Número de telefone do lead inválido ou curto demais');
            }
          } else {
             console.log('[WhatsApp] No client phone found in form data');
             // Optional: Log that we couldn't find a phone number
             await logIntegration(pool, form.id, lead.id, 'whatsapp_lead', 'error', {}, null, 'Telefone do lead não encontrado nos dados do formulário');
          }
        } catch (error) {
          console.error('[WhatsApp] Global Error:', error.message);
          await logIntegration(pool, form.id, lead.id, 'whatsapp_global', 'error', {}, null, error.message);
        }
      })());
    }
  }

  // 3. Facebook Conversions API
  if (settings.facebook_pixel && settings.facebook_pixel_access_token) {
    integrations.push((async () => {
      try {
        console.log('[Facebook] Processing CAPI...');
        const userData = {};
        
        // Find and hash user data
        const email = findField(data, ['email', 'e-mail', 'mail']);
        if (email) userData.em = [hashData(String(email).toLowerCase().trim())];
        
        const phone = findField(data, ['phone', 'whatsapp', 'telefone', 'celular']);
        if (phone) userData.ph = [hashData(String(phone).replace(/\D/g, ''))];
        
        const name = findField(data, ['nome', 'name']);
        if (name) {
          const nameParts = String(name).trim().split(' ');
          if (nameParts[0]) userData.fn = [hashData(nameParts[0].toLowerCase())];
          if (nameParts.length > 1) userData.ln = [hashData(nameParts[nameParts.length - 1].toLowerCase())];
        }

        userData.client_ip_address = ipAddress;
        userData.client_user_agent = userAgent;
        console.log('[Facebook] Processing CAPI with UserData keys:', Object.keys(userData));

        const eventData = {
          data: [{
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: `${reqOrigin}/f/${form.slug}`,
            user_data: userData,
            custom_data: {
              form_name: form.name,
              form_slug: form.slug,
              lead_id: lead.id,
            },
          }],
        };

        if (settings.facebook_pixel_test_code) {
          eventData.test_event_code = settings.facebook_pixel_test_code;
        }

        const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${settings.facebook_pixel}/events?access_token=${settings.facebook_pixel_access_token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });

        if (!fbResponse.ok) {
          const fbErr = await fbResponse.json();
          console.error('[Facebook] API Error:', JSON.stringify(fbErr));
          await logIntegration(pool, form.id, lead.id, 'facebook', 'error', eventData, fbErr, fbErr.error?.message);
        } else {
          const fbRes = await fbResponse.json();
          console.log('[Facebook] Sent successfully. ID:', fbRes.fbtrace_id || 'ok');
          await logIntegration(pool, form.id, lead.id, 'facebook', 'success', eventData, fbRes);
        }
      } catch (error) {
        console.error('[Facebook] Error:', error.message);
        await logIntegration(pool, form.id, lead.id, 'facebook', 'error', {}, null, error.message);
      }
    })());
  }

  // 4. RD Station (New)
  const rdToken = settings.rdstation_api_token || settings.rd_station_token;
  if (rdToken && settings.rdstation_enabled) {
    integrations.push((async () => {
      try {
        console.log('[RD Station] Processing...');
        const email = findField(data, ['email', 'e-mail', 'mail']);
        
        if (!email) {
          console.warn('[RD Station] Skipped: Email is required');
          return;
        }

        const payload = {
          event_type: "CONVERSION",
          event_family: "CDP",
          payload: {
            conversion_identifier: settings.rdstation_conversion_identifier || form.slug,
            email: String(email).trim(),
            ...data
          }
        };

        // Use Public Token endpoint
        const rdResponse = await fetch(`https://api.rd.services/platform/conversions_client/v1/conversions?api_key=${rdToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!rdResponse.ok) {
          const rdErr = await rdResponse.json();
          console.error('[RD Station] API Error:', JSON.stringify(rdErr));
          await logIntegration(pool, form.id, lead.id, 'rdstation', 'error', payload, rdErr, rdErr.errors?.[0]?.message);
        } else {
          console.log('[RD Station] Sent successfully');
          const rdRes = await rdResponse.json().catch(() => ({}));
          await logIntegration(pool, form.id, lead.id, 'rdstation', 'success', payload, rdRes);
        }
      } catch (error) {
        console.error('[RD Station] Error:', error.message);
        await logIntegration(pool, form.id, lead.id, 'rdstation', 'error', {}, null, error.message);
      }
    })());
  }

  // Execute all integrations in parallel (background)
  await Promise.allSettled(integrations);
};

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

    // Execute integrations asynchronously (Fire and Forget)
    const reqOrigin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    processIntegrations(form, lead, data, ipAddress, userAgent, reqOrigin, pool).catch(err => {
      console.error('Error processing integrations:', err);
    });

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
