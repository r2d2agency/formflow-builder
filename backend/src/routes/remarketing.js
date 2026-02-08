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

module.exports = router;
