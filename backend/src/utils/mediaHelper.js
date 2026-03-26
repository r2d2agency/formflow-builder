const fs = require('fs');
const path = require('path');

const readRemoteFileAsBase64 = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch remote media: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
};

/**
 * Convert local upload URLs or remote media URLs to Base64 content for Evolution API.
 * - rawBase64=true: returns plain base64 (used for WhatsApp audio/PTT)
 * - rawBase64=false: returns Data URI for local files when needed
 */
const getMediaContent = async (url, mimeType, { rawBase64 = false } = {}) => {
  try {
    if (!url || typeof url !== 'string') return url;

    if (rawBase64 && /^data:[^;]+;base64,/i.test(url)) {
      return url.replace(/^data:[^;]+;base64,/i, '');
    }

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
            return rawBase64 ? base64 : `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
          }

          console.warn(`[MediaHelper] Local file not found: ${filePath}`);
        }
      }
    }

    if (rawBase64 && /^https?:\/\//i.test(url)) {
      console.log(`[MediaHelper] Fetching remote media for Base64 conversion: ${url}`);
      return await readRemoteFileAsBase64(url);
    }

    return url;
  } catch (error) {
    console.error('[MediaHelper] Error converting media:', error.message);
    return url;
  }
};

module.exports = { getMediaContent };
