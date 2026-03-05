const fs = require('fs');
const path = require('path');

/**
 * Convert local upload URLs to Base64 Data URIs for Evolution API.
 * If the URL points to a local /api/uploads/ path, reads the file from disk.
 */
const getMediaContent = (url, mimeType) => {
  try {
    if (!url || typeof url !== 'string') return url;

    // Check if URL points to our uploads
    if (url.includes('/api/uploads/') || url.includes('/uploads/')) {
      const uploadMarker = url.includes('/api/uploads/') ? '/api/uploads/' : '/uploads/';
      const parts = url.split(uploadMarker);
      if (parts.length >= 2) {
        const subPath = parts[parts.length - 1];
        const cleanSubPath = subPath.replace(/\\/g, '/');
        const pathParts = cleanSubPath.split('/');

        if (pathParts.length >= 2) {
          const type = pathParts[0];
          const filename = pathParts.slice(1).join('/');

          const uploadDir = process.env.UPLOAD_DIR || '/app/uploads';
          const filePath = path.join(uploadDir, type, filename);

          if (fs.existsSync(filePath)) {
            console.log(`[MediaHelper] Converting local file to Base64: ${filePath}`);
            const fileBuffer = fs.readFileSync(filePath);
            const base64 = fileBuffer.toString('base64');
            return `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
          } else {
            console.warn(`[MediaHelper] Local file not found: ${filePath}`);
          }
        }
      }
    }

    // Return original URL if not a local file
    return url;
  } catch (error) {
    console.error('[MediaHelper] Error converting media:', error.message);
    return url;
  }
};

module.exports = { getMediaContent };
