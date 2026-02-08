const express = require('express');
const authMiddleware = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Directory for storing uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

// Ensure upload directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// GET /api/uploads/:type/:filename - Serve uploaded files (public)
router.get('/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    const validTypes = ['logos', 'audio', 'video', 'documents', 'images'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipo inválido' });
    }
    
    const filePath = path.join(UPLOAD_DIR, type, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Arquivo não encontrado' });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('[uploads] Get file error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar arquivo' });
  }
});

// POST /api/uploads/:type - Upload a file (authenticated)
router.post('/:type', authMiddleware, async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['logos', 'audio', 'video', 'documents', 'images'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipo inválido' });
    }
    
    const { file_base64, filename, content_type } = req.body;
    
    if (!file_base64 || !filename) {
      return res.status(400).json({ success: false, error: 'Arquivo e nome são obrigatórios' });
    }
    
    // Remove data URL prefix if present
    const base64Data = file_base64.replace(/^data:[^;]+;base64,/, '');
    
    // Generate unique filename
    const ext = path.extname(filename) || '';
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    
    // Ensure directory exists
    const typeDir = path.join(UPLOAD_DIR, type);
    ensureDir(typeDir);
    
    // Save file
    const filePath = path.join(typeDir, uniqueFilename);
    fs.writeFileSync(filePath, base64Data, 'base64');
    
    // Generate public URL
    let baseUrl = process.env.API_BASE_URL;
    if (!baseUrl) {
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      baseUrl = `${protocol}://${host}`;
    }
    const fileUrl = `${baseUrl}/api/uploads/${type}/${uniqueFilename}`;
    
    res.json({ 
      success: true, 
      data: { 
        url: fileUrl,
        filename: uniqueFilename,
        original_filename: filename,
        content_type: content_type || 'application/octet-stream'
      } 
    });
  } catch (error) {
    console.error('[uploads] Upload file error:', error);
    res.status(500).json({ success: false, error: 'Erro ao fazer upload' });
  }
});

// DELETE /api/uploads/:type/:filename - Delete a file (authenticated)
router.delete('/:type/:filename', authMiddleware, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const validTypes = ['logos', 'audio', 'video', 'documents', 'images'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Tipo inválido' });
    }
    
    const filePath = path.join(UPLOAD_DIR, type, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ success: true, message: 'Arquivo excluído' });
  } catch (error) {
    console.error('[uploads] Delete file error:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir arquivo' });
  }
});

module.exports = router;
