const express = require('express');
const router = express.Router();

// --- Migration Helper (Temporary) ---
router.get('/migrate-schema', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    
    // 1. Drop the constraint
    try {
      await pool.query('ALTER TABLE remarketing_steps DROP CONSTRAINT IF EXISTS remarketing_steps_message_type_check');
      console.log('Dropped old constraint');
    } catch (e) {
      console.log('Constraint might not exist or different name:', e.message);
    }

    // 2. Add new constraint
    await pool.query(`
      ALTER TABLE remarketing_steps 
      ADD CONSTRAINT remarketing_steps_message_type_check 
      CHECK (message_type IN ('text', 'audio', 'video', 'document', 'image', 'multi'))
    `);

    res.json({ success: true, message: 'Schema updated for multi-message support' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

const authMiddleware = require('../middleware/auth');
router.use(authMiddleware);

// --- Campaigns ---

// GET /api/remarketing/campaigns/:formId
router.get('/campaigns/:formId', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { formId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check permission
    if (!isAdmin) {
      const permCheck = await pool.query(
        'SELECT 1 FROM user_forms WHERE user_id = $1 AND form_id = $2',
        [userId, formId]
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acesso negado a este formulário' });
      }
    }

    const result = await pool.query(
      `SELECT * FROM remarketing_campaigns 
       WHERE form_id = $1 
       ORDER BY created_at DESC`,
      [formId]
    );

    // For each campaign, get its steps
    const campaigns = result.rows;
    for (const campaign of campaigns) {
      const stepsResult = await pool.query(
        `SELECT * FROM remarketing_steps 
         WHERE campaign_id = $1 
         ORDER BY step_order ASC`,
        [campaign.id]
      );
      campaign.steps = stepsResult.rows;
    }

    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar campanhas' });
  }
});

// POST /api/remarketing/campaigns
router.post('/campaigns', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { form_id, name, type, is_active } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check permission
    if (!isAdmin) {
      const permCheck = await pool.query(
        'SELECT 1 FROM user_forms WHERE user_id = $1 AND form_id = $2',
        [userId, form_id]
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acesso negado a este formulário' });
      }
    }

    const result = await pool.query(
      `INSERT INTO remarketing_campaigns (form_id, name, type, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [form_id, name, type, is_active]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar campanha' });
  }
});

// PUT /api/remarketing/campaigns/:id
router.put('/campaigns/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { name, is_active } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check permission if not admin
    if (!isAdmin) {
      const permCheck = await pool.query(
        `SELECT 1 FROM remarketing_campaigns rc
         JOIN user_forms uf ON rc.form_id = uf.form_id
         WHERE rc.id = $1 AND uf.user_id = $2`,
        [id, userId]
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acesso negado a esta campanha' });
      }
    }

    const result = await pool.query(
      `UPDATE remarketing_campaigns 
       SET name = $1, is_active = $2
       WHERE id = $3
       RETURNING *`,
      [name, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Campanha não encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar campanha' });
  }
});

// DELETE /api/remarketing/campaigns/:id
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check permission if not admin
    if (!isAdmin) {
      const permCheck = await pool.query(
        `SELECT 1 FROM remarketing_campaigns rc
         JOIN user_forms uf ON rc.form_id = uf.form_id
         WHERE rc.id = $1 AND uf.user_id = $2`,
        [id, userId]
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acesso negado a esta campanha' });
      }
    }

    await pool.query('DELETE FROM remarketing_campaigns WHERE id = $1', [id]);

    res.json({ success: true, message: 'Campanha excluída' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir campanha' });
  }
});

// --- Steps ---

// POST /api/remarketing/steps
router.post('/steps', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { campaign_id, step_order, delay_value, delay_unit, message_type, message_content } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check permission if not admin
    if (!isAdmin) {
      const permCheck = await pool.query(
        `SELECT 1 FROM remarketing_campaigns rc
         JOIN user_forms uf ON rc.form_id = uf.form_id
         WHERE rc.id = $1 AND uf.user_id = $2`,
        [campaign_id, userId]
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acesso negado a esta campanha' });
      }
    }

    const result = await pool.query(
      `INSERT INTO remarketing_steps (campaign_id, step_order, delay_value, delay_unit, message_type, message_content)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [campaign_id, step_order, delay_value, delay_unit, message_type, message_content]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create step error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar passo' });
  }
});

// PUT /api/remarketing/steps/:id
router.put('/steps/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { step_order, delay_value, delay_unit, message_type, message_content } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check permission if not admin
    if (!isAdmin) {
      const permCheck = await pool.query(
        `SELECT 1 FROM remarketing_steps rs
         JOIN remarketing_campaigns rc ON rs.campaign_id = rc.id
         JOIN user_forms uf ON rc.form_id = uf.form_id
         WHERE rs.id = $1 AND uf.user_id = $2`,
        [id, userId]
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acesso negado a este passo' });
      }
    }

    const result = await pool.query(
      `UPDATE remarketing_steps 
       SET step_order = $1, delay_value = $2, delay_unit = $3, message_type = $4, message_content = $5
       WHERE id = $6
       RETURNING *`,
      [step_order, delay_value, delay_unit, message_type, message_content, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Passo não encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update step error:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar passo' });
  }
});

// DELETE /api/remarketing/steps/:id
router.delete('/steps/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Check permission if not admin
    if (!isAdmin) {
      const permCheck = await pool.query(
        `SELECT 1 FROM remarketing_steps rs
         JOIN remarketing_campaigns rc ON rs.campaign_id = rc.id
         JOIN user_forms uf ON rc.form_id = uf.form_id
         WHERE rs.id = $1 AND uf.user_id = $2`,
        [id, userId]
      );
      if (permCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Acesso negado a este passo' });
      }
    }

    await pool.query('DELETE FROM remarketing_steps WHERE id = $1', [id]);

    res.json({ success: true, message: 'Passo excluído' });
  } catch (error) {
    console.error('Delete step error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir passo' });
  }
});

// --- Test ---

// POST /api/remarketing/campaigns/:id/test
router.post('/campaigns/:id/test', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { id } = req.params;
    const { target_number, instance_id } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!target_number || !instance_id) {
        return res.status(400).json({ success: false, error: 'Número de destino e instância são obrigatórios' });
    }

    // 1. Check permission and get campaign
    let campaignCheckQuery = `SELECT rc.* FROM remarketing_campaigns rc `;
    let queryParams = [id];

    if (!isAdmin) {
        campaignCheckQuery += ` JOIN user_forms uf ON rc.form_id = uf.form_id WHERE rc.id = $1 AND uf.user_id = $2`;
        queryParams.push(userId);
    } else {
        campaignCheckQuery += ` WHERE rc.id = $1`;
    }

    const campaignResult = await pool.query(campaignCheckQuery, queryParams);
    if (campaignResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Campanha não encontrada ou acesso negado' });
    }

    // 2. Get Steps
    const stepsResult = await pool.query(
        `SELECT * FROM remarketing_steps WHERE campaign_id = $1 ORDER BY step_order ASC`,
        [id]
    );
    const steps = stepsResult.rows;

    if (steps.length === 0) {
        return res.json({ success: true, message: 'Campanha sem passos para testar' });
    }

    // 3. Get Instance Config
    const instanceResult = await pool.query(
        `SELECT * FROM evolution_instances WHERE id = $1`,
        [instance_id]
    );
    if (instanceResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Instância Evolution não encontrada' });
    }
    const instance = instanceResult.rows[0];

    // 4. Send Messages Logic
    const cleanPhone = target_number.replace(/\D/g, '');
    
    // Helper to send message via Evolution
    const sendMessage = async (content, type, delay) => {
        let endpoint = '/message/sendText';
        let payload = {
            number: cleanPhone,
            delay: delay,
            linkPreview: false
        };
        
        // Mock variable replacement
        const mockData = {
            name: 'Visitante Teste',
            nome: 'Visitante Teste',
            email: 'teste@exemplo.com',
            phone: target_number,
            telefone: target_number
        };
        
        const replaceVars = (text) => {
            if (!text) return '';
            let newText = text;
            // Replace {var} style
            for (const [key, value] of Object.entries(mockData)) {
                const regex = new RegExp(`\\{${key}\\}`, 'gi');
                newText = newText.replace(regex, value);
            }
            // Replace {{var}} style just in case
            for (const [key, value] of Object.entries(mockData)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
                newText = newText.replace(regex, value);
            }
            return newText;
        };

        if (type === 'text') {
             endpoint = '/message/sendText';
             payload.text = replaceVars(content);
        } else if (type === 'audio') {
             endpoint = '/message/sendWhatsAppAudio';
             payload.audio = content; 
        } else if (['video', 'document', 'image'].includes(type)) {
             endpoint = '/message/sendMedia';
             payload.mediatype = type;
             payload.media = content;
             // Simple mock filename
             if (type === 'document') payload.fileName = 'documento-teste.pdf';
        }

        const url = instance.internal_api_url || instance.api_url;
        // Ensure url doesn't end with slash
        const effectiveUrl = url.replace(/\/$/, '');
        
        try {
            console.log(`[Test Campaign] Sending ${type} to ${cleanPhone}`);
            await fetch(`${effectiveUrl}${endpoint}/${instance.name}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': instance.api_key
                },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error('Error sending test message:', e);
        }
    };

    // Process steps sequentially
    // We use a simple loop with pauses to simulate the flow
    for (const step of steps) {
        // Wait 2 seconds between steps for visualization in WhatsApp
        if (steps.indexOf(step) > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (step.message_type === 'multi') {
            let messages = [];
            try {
                messages = typeof step.message_content === 'string' 
                    ? JSON.parse(step.message_content) 
                    : step.message_content;
            } catch (e) {
                messages = [{ type: 'text', content: 'Erro ao processar mensagem múltipla' }];
            }
            
            for (const msg of messages) {
                await sendMessage(msg.content, msg.type, 1200); // 1.2s typing
                await new Promise(resolve => setTimeout(resolve, 1500)); // wait between sub-messages
            }
        } else {
            await sendMessage(step.message_content, step.message_type, 1200);
        }
    }

    res.json({ success: true, message: 'Teste enviado com sucesso' });

  } catch (error) {
    console.error('Test campaign error:', error);
    res.status(500).json({ success: false, error: 'Erro ao testar campanha' });
  }
});

module.exports = router;
