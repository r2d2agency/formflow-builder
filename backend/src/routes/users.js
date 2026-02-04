const express = require('express');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Middleware to check if user is admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// GET /api/users - List all users (admin only)
router.get('/', adminOnly, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[users] Get users error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar usuários' });
  }
});

// GET /api/users/:id - Get single user (admin only)
router.get('/:id', adminOnly, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    // Get user's assigned forms
    const formsResult = await pool.query(
      `SELECT f.id, f.name, f.slug 
       FROM forms f 
       INNER JOIN user_forms uf ON f.id = uf.form_id 
       WHERE uf.user_id = $1`,
      [req.params.id]
    );

    res.json({ 
      success: true, 
      data: {
        ...result.rows[0],
        assigned_forms: formsResult.rows
      }
    });
  } catch (error) {
    console.error('[users] Get user error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar usuário' });
  }
});

// POST /api/users - Create new user (admin only)
router.post('/', adminOnly, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { email, password, name, role, form_ids } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, senha e nome são obrigatórios' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, password_hash, name, role || 'user']
    );

    const newUser = result.rows[0];

    // Assign forms if provided
    if (form_ids && form_ids.length > 0 && role !== 'admin') {
      for (const formId of form_ids) {
        await pool.query(
          'INSERT INTO user_forms (user_id, form_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newUser.id, formId]
        );
      }
    }

    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    console.error('[users] Create user error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Email já cadastrado' });
    }
    res.status(500).json({ success: false, error: 'Erro ao criar usuário' });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', adminOnly, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { email, name, role, form_ids } = req.body;

    const result = await pool.query(
      `UPDATE users SET email = $1, name = $2, role = $3
       WHERE id = $4
       RETURNING id, email, name, role, created_at, updated_at`,
      [email, name, role, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    // Update form assignments if provided
    if (form_ids !== undefined) {
      // Remove old assignments
      await pool.query('DELETE FROM user_forms WHERE user_id = $1', [req.params.id]);
      
      // Add new assignments (only for non-admin users)
      if (role !== 'admin' && form_ids.length > 0) {
        for (const formId of form_ids) {
          await pool.query(
            'INSERT INTO user_forms (user_id, form_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.params.id, formId]
          );
        }
      }
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[users] Update user error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Email já cadastrado' });
    }
    res.status(500).json({ success: false, error: 'Erro ao atualizar usuário' });
  }
});

// PUT /api/users/:id/password - Change password (admin only, or user changing own password)
router.put('/:id/password', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { current_password, new_password } = req.body;
    const targetUserId = req.params.id;
    const requestingUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // User can only change their own password, unless they're admin
    if (targetUserId !== requestingUserId && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Sem permissão para alterar senha de outro usuário' });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // If not admin, verify current password
    if (!isAdmin || targetUserId === requestingUserId) {
      if (!current_password) {
        return res.status(400).json({ success: false, error: 'Senha atual é obrigatória' });
      }

      const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [targetUserId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }

      const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
      if (!validPassword) {
        return res.status(401).json({ success: false, error: 'Senha atual incorreta' });
      }
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, targetUserId]);

    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('[users] Change password error:', error);
    res.status(500).json({ success: false, error: 'Erro ao alterar senha' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    // Prevent deleting yourself
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Você não pode excluir sua própria conta' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }

    res.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('[users] Delete user error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir usuário' });
  }
});

// GET /api/users/:id/forms - Get user's assigned forms
router.get('/:id/forms', adminOnly, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      `SELECT f.id, f.name, f.slug, f.type, f.is_active
       FROM forms f 
       INNER JOIN user_forms uf ON f.id = uf.form_id 
       WHERE uf.user_id = $1
       ORDER BY f.name`,
      [req.params.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[users] Get user forms error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar formulários do usuário' });
  }
});

module.exports = router;
