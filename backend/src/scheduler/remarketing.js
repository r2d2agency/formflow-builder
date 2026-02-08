const process = require('process');

// Helper to find phone number
const findField = (data, searchTerms) => {
  if (!data || typeof data !== 'object') return null;
  const entry = Object.entries(data).find(([key]) => 
    searchTerms.some(term => key.toLowerCase().includes(term))
  );
  return entry ? entry[1] : null;
};

// Helper to replace variables
const replaceVariables = (text, lead, formName) => {
  if (!text) return '';
  let processed = String(text);
  const data = lead.data || {};
  
  processed = processed.replace(/\{\{form_name\}\}/g, formName || '');
  
  // Name
  const leadName = findField(data, ['nome', 'name', 'full_name', 'completo']) || '';
  processed = processed.replace(/\{\{name\}\}/g, leadName);
  processed = processed.replace(/\{\{nome\}\}/g, leadName);
  
  // Other fields
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    processed = processed.replace(regex, String(value || ''));
  }
  return processed;
};

const processCampaigns = async (pool) => {
  try {
    // 1. Get active campaigns
    const campaignsResult = await pool.query(`
      SELECT c.*, f.settings as form_settings, f.name as form_name
      FROM remarketing_campaigns c
      JOIN forms f ON c.form_id = f.id
      WHERE c.is_active = true AND f.is_active = true
    `);

    for (const campaign of campaignsResult.rows) {
      // 2. Get steps for this campaign
      const stepsResult = await pool.query(`
        SELECT * FROM remarketing_steps 
        WHERE campaign_id = $1 
        ORDER BY step_order ASC
      `, [campaign.id]);

      if (stepsResult.rows.length === 0) continue;

      // 3. Get Evolution Instance
      const settings = campaign.form_settings || {};
      if (!settings.evolution_instance_id) continue; // No instance configured

      const instanceResult = await pool.query(
        'SELECT * FROM evolution_instances WHERE id = $1 AND is_active = true',
        [settings.evolution_instance_id]
      );

      if (instanceResult.rows.length === 0) continue;
      const instance = instanceResult.rows[0];
      const instanceName = instance.name.trim();
      const apiKey = instance.api_key.trim();
      const apiUrl = instance.api_url ? instance.api_url.replace(/\/+$/, '') : '';

      // 4. Process each step
      for (const step of stepsResult.rows) {
        // Calculate interval
        // step.delay_unit is 'minutes', 'hours', 'days'
        // Postgres syntax: "5 minutes"
        const intervalStr = `${step.delay_value} ${step.delay_unit}`;

        let leadsQuery = '';
        let timeField = '';
        let isPartial = false;

        if (campaign.type === 'recovery') {
          // Recovery: Partial leads, time relative to updated_at (last interaction)
          timeField = 'updated_at';
          isPartial = true;
        } else {
          // Drip: Completed leads, time relative to created_at (submission)
          timeField = 'created_at';
          isPartial = false;
        }

        // Find eligible leads
        // - Correct status (partial/complete)
        // - Time passed > delay
        // - Time passed < delay + window (to avoid sending to very old leads if system was down)
        //   Let's set a window of 24 hours after the due time.
        // - Not already sent (check logs)
        
        // Construct the interval for SQL
        // We use string interpolation carefully for the interval
        
        const leadsResult = await pool.query(`
          SELECT l.* 
          FROM leads l
          WHERE l.form_id = $1 
            AND (l.is_partial = $2 OR ($2 IS NULL AND l.is_partial IS NULL)) -- Handle partial logic
            AND l.${timeField} < NOW() - $3::INTERVAL
            AND l.${timeField} > NOW() - $3::INTERVAL - INTERVAL '24 hours' -- Safety window
            AND NOT EXISTS (
              SELECT 1 FROM remarketing_logs rl
              WHERE rl.lead_id = l.id
                AND rl.step_id = $4
                AND rl.status = 'success'
            )
        `, [campaign.form_id, isPartial, intervalStr, step.id]);

        for (const lead of leadsResult.rows) {
          // Send message
          await sendMessage(pool, instance, lead, campaign, step, replaceVariables(step.message_content, lead, campaign.form_name));
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error processing campaigns:', error);
  }
};

const sendMessage = async (pool, instance, lead, campaign, step, content) => {
  const leadData = lead.data || {};
  const phone = findField(leadData, ['phone', 'whatsapp', 'telefone', 'celular', 'mobile']);

  if (!phone) {
    await logAttempt(pool, lead.id, campaign.id, step.id, 'skipped', 'No phone number found');
    return;
  }

  const cleanPhone = String(phone).replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    await logAttempt(pool, lead.id, campaign.id, step.id, 'skipped', 'Invalid phone number');
    return;
  }

  // Construct API URL
  const apiUrl = instance.api_url ? instance.api_url.replace(/\/+$/, '') : '';
  const apiKey = instance.api_key.trim();
  
  let endpoint = '/message/sendText';
  let body = {
    number: cleanPhone,
    text: content,
    linkPreview: true
  };

  if (step.message_type !== 'text') {
    // Media message
    // Assuming content is the URL for the media
    // If content has text caption, we might need a separate field or format.
    // For now, assume content = URL
    endpoint = '/message/sendMedia';
    
    // Check if content is a valid URL
    if (!content.startsWith('http')) {
        await logAttempt(pool, lead.id, campaign.id, step.id, 'error', 'Invalid media URL');
        return;
    }

    body = {
      number: cleanPhone,
      mediaMessage: {
        mediatype: step.message_type, // image, video, audio, document
        media: content, // The URL
        caption: '' // Optional caption
      }
    };
  }

  try {
    const res = await fetch(`${apiUrl}${endpoint}/${instance.name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(body)
    });

    const resData = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log(`[Scheduler] Sent ${campaign.type} message to ${cleanPhone}`);
      await logAttempt(pool, lead.id, campaign.id, step.id, 'success');
    } else {
      console.error(`[Scheduler] Evolution API error:`, resData);
      await logAttempt(pool, lead.id, campaign.id, step.id, 'error', resData.message || 'Unknown error');
    }
  } catch (error) {
    console.error(`[Scheduler] Request error:`, error.message);
    await logAttempt(pool, lead.id, campaign.id, step.id, 'error', error.message);
  }
};

const logAttempt = async (pool, leadId, campaignId, stepId, status, errorMessage = null) => {
  try {
    await pool.query(`
      INSERT INTO remarketing_logs (lead_id, campaign_id, step_id, status, error_message)
      VALUES ($1, $2, $3, $4, $5)
    `, [leadId, campaignId, stepId, status, errorMessage]);
  } catch (e) {
    console.error('[Scheduler] Failed to log attempt:', e.message);
  }
};

const startScheduler = (pool) => {
  console.log('[Scheduler] Starting Remarketing Scheduler (Interval: 60s)');
  
  // Run immediately on start
  processCampaigns(pool);

  // Run every 60 seconds
  setInterval(() => {
    processCampaigns(pool);
  }, 60 * 1000);
};

module.exports = { startScheduler };
