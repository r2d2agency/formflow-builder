const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const showPartial = req.query.show_partial === 'true';
    const { start_date, end_date } = req.query;
    
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const conditions = [];
    const params = [];
    let paramCount = 1;

    // Filter by partial status
    if (!showPartial) {
        conditions.push('(l.is_partial IS NULL OR l.is_partial = false)');
    }

    if (start_date) {
        conditions.push(`l.created_at >= $${paramCount}`);
        params.push(start_date);
        paramCount++;
    }

    if (end_date) {
        conditions.push(`l.created_at <= $${paramCount}`);
        params.push(end_date);
        paramCount++;
    }

    // Filter by user forms if not admin
    if (!isAdmin) {
        conditions.push(`l.form_id IN (SELECT form_id FROM user_forms WHERE user_id = $${paramCount})`);
        params.push(userId);
        paramCount++;
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT l.*, f.name as form_name, f.slug as form_slug
       FROM leads l
       JOIN forms f ON l.form_id = f.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      dataParams
    );

    res.json({
      success: true,
      data: {
        data: result.rows,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar leads' });
  }
});

// GET /api/leads/form/:formId
router.get('/form/:formId', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const showPartial = req.query.show_partial === 'true';
    const { start_date, end_date } = req.query;

    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    if (!isAdmin) {
        const permCheck = await pool.query(
            'SELECT 1 FROM user_forms WHERE user_id = $1 AND form_id = $2',
            [userId, req.params.formId]
        );
        if (permCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Acesso negado a este formulário' });
        }
    }

    const conditions = [];
    const params = [];
    let paramCount = 1;

    // Filter by form
    conditions.push(`l.form_id = $${paramCount}`);
    params.push(req.params.formId);
    paramCount++;

    // Filter by partial status
    if (!showPartial) {
        conditions.push('(l.is_partial IS NULL OR l.is_partial = false)');
    }

    if (start_date) {
        conditions.push(`l.created_at >= $${paramCount}`);
        params.push(start_date);
        paramCount++;
    }

    if (end_date) {
        conditions.push(`l.created_at <= $${paramCount}`);
        params.push(end_date);
        paramCount++;
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT l.*, f.name as form_name
       FROM leads l
       JOIN forms f ON l.form_id = f.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      dataParams
    );

    res.json({
      success: true,
      data: {
        data: result.rows,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get leads by form error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT l.*, f.name as form_name
      FROM leads l
      JOIN forms f ON l.form_id = f.id
      WHERE l.id = $1
    `;
    const params = [req.params.id];

    if (!isAdmin) {
        query += ` AND l.form_id IN (SELECT form_id FROM user_forms WHERE user_id = $2)`;
        params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado ou acesso negado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar lead' });
  }
});

// DELETE /api/leads/bulk
router.delete('/bulk', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { ids, delete_all, filters } = req.body;

    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (delete_all) {
      // Delete based on filters
      let query = 'DELETE FROM leads';
      const params = [];
      let paramCount = 1;
      const conditions = [];

      // Apply filters
      if (filters) {
        if (filters.form_id && filters.form_id !== 'all') {
            conditions.push(`form_id = $${paramCount}`);
            params.push(filters.form_id);
            paramCount++;
        }
        if (filters.start_date) {
            conditions.push(`created_at >= $${paramCount}`);
            params.push(filters.start_date);
            paramCount++;
        }
        if (filters.end_date) {
            conditions.push(`created_at <= $${paramCount}`);
            params.push(filters.end_date);
            paramCount++;
        }
        // Partial filter logic if needed, but usually bulk delete applies to what's seen
        if (filters.show_partial !== true) {
             conditions.push('(is_partial IS NULL OR is_partial = false)');
        }
      }

      // Filter by user forms if not admin
      if (!isAdmin) {
          conditions.push(`form_id IN (SELECT form_id FROM user_forms WHERE user_id = $${paramCount})`);
          params.push(userId);
          paramCount++;
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      const result = await pool.query(query, params);
      return res.json({ success: true, message: `${result.rowCount} leads excluídos com sucesso` });
    } else {
      // Delete by IDs
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'IDs não fornecidos' });
      }

      let query = 'DELETE FROM leads WHERE id = ANY($1)';
      const params = [ids];
      let paramCount = 2;
      
      if (!isAdmin) {
          query += ` AND form_id IN (SELECT form_id FROM user_forms WHERE user_id = $${paramCount})`;
          params.push(userId);
      }

      const result = await pool.query(query, params);
      return res.json({ success: true, message: `${result.rowCount} leads excluídos com sucesso` });
    }
  } catch (error) {
    console.error('Bulk delete leads error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir leads' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    let query = 'DELETE FROM leads WHERE id = $1';
    const params = [req.params.id];
    
    if (!isAdmin) {
        query += ' AND form_id IN (SELECT form_id FROM user_forms WHERE user_id = $2)';
        params.push(userId);
    }

    const result = await pool.query(query + ' RETURNING id', params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead não encontrado' });
    }

    res.json({ success: true, message: 'Lead excluído com sucesso' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir lead' });
  }
});

// GET /api/leads/export/csv
router.get('/export/csv', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const formId = req.query.form_id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT l.id, l.data, l.source, l.ip_address, l.created_at, f.name as form_name
      FROM leads l
      JOIN forms f ON l.form_id = f.id
    `;
    const params = [];
    let paramCount = 1;

    const conditions = [];

    if (formId) {
      conditions.push(`l.form_id = $${paramCount}`);
      params.push(formId);
      paramCount++;
    }

    if (!isAdmin) {
        conditions.push(`l.form_id IN (SELECT form_id FROM user_forms WHERE user_id = $${paramCount})`);
        params.push(userId);
        paramCount++;
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Nenhum lead encontrado' });
    }

    const headers = ['ID', 'Formulário', 'Dados', 'Fonte', 'IP', 'Data'];
    const rows = result.rows.map(row => [
      row.id,
      row.form_name,
      JSON.stringify(row.data),
      row.source || '',
      row.ip_address || '',
      row.created_at,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export leads error:', error);
    res.status(500).json({ success: false, error: 'Erro ao exportar leads' });
  }
});

// GET /api/leads/export/excel
router.get('/export/excel', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const formId = req.query.form_id;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT l.id, l.data, l.source, l.ip_address, l.created_at, f.name as form_name, f.fields
      FROM leads l
      JOIN forms f ON l.form_id = f.id
    `;
    const params = [];
    let paramCount = 1;

    const conditions = [];

    if (formId) {
      conditions.push(`l.form_id = $${paramCount}`);
      params.push(formId);
      paramCount++;
    }

    if (!isAdmin) {
        conditions.push(`l.form_id IN (SELECT form_id FROM user_forms WHERE user_id = $${paramCount})`);
        params.push(userId);
        paramCount++;
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Nenhum lead encontrado' });
    }

    // Get all unique field keys from lead data
    const allKeys = new Set();
    result.rows.forEach(row => {
      if (row.data && typeof row.data === 'object') {
        Object.keys(row.data).forEach(key => allKeys.add(key));
      }
    });
    
    const fieldKeys = Array.from(allKeys);
    
    // Build headers: fixed columns + dynamic field columns
    const headers = ['ID', 'Formulário', ...fieldKeys, 'Fonte', 'IP', 'Data'];
    
    // Build rows
    const rows = result.rows.map(row => {
      const data = row.data || {};
      const fieldValues = fieldKeys.map(key => {
        const val = data[key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val).replace(/"/g, '""'); // Escape quotes for CSV
      });
      
      return [
        row.id,
        row.form_name,
        ...fieldValues,
        row.source || '',
        row.ip_address || '',
        new Date(row.created_at).toLocaleString('pt-BR'),
      ];
    });

    // Generate CSV with proper escaping for Excel
    const escapeCell = (cell) => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const csv = BOM + [
      headers.map(escapeCell).join(','),
      ...rows.map(row => row.map(escapeCell).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export leads Excel error:', error);
    res.status(500).json({ success: false, error: 'Erro ao exportar leads' });
  }
});

module.exports = router;
