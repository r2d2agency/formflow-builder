const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads';

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const normalizeUrl = (url) => String(url || '').trim().replace(/\/+$/, '');

const getPublicBaseUrl = ({ req, sourceUrl } = {}) => {
  const configuredBaseUrl = [
    process.env.PUBLIC_BASE_URL,
    process.env.API_PUBLIC_URL,
    process.env.API_BASE_URL,
  ].find(Boolean);

  if (configuredBaseUrl) {
    return normalizeUrl(configuredBaseUrl).replace(/\/api$/, '');
  }

  if (req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host) {
      return `${protocol}://${host}`;
    }
  }

  if (/^https?:\/\//i.test(String(sourceUrl || ''))) {
    try {
      const parsed = new URL(sourceUrl);
      if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
        return parsed.origin;
      }
    } catch (error) {
      console.warn('[AudioTranscoder] Failed to infer public host from source URL:', error.message);
    }
  }

  return null;
};

const getLocalUploadPath = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('/api/uploads/') && !url.includes('/uploads/')) return null;

  const uploadMarker = url.includes('/api/uploads/') ? '/api/uploads/' : '/uploads/';
  const parts = url.split(uploadMarker);
  if (parts.length < 2) return null;

  const subPath = parts[parts.length - 1].replace(/\\/g, '/');
  const pathParts = subPath.split('/');
  if (pathParts.length < 2) return null;

  const type = pathParts[0];
  const filename = pathParts.slice(1).join('/');
  return path.join(UPLOAD_DIR, type, filename);
};

const extensionFromMimeType = (mimeType) => {
  if (!mimeType) return '.bin';
  if (mimeType.includes('ogg')) return '.ogg';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return '.mp3';
  if (mimeType.includes('wav')) return '.wav';
  if (mimeType.includes('aac')) return '.aac';
  if (mimeType.includes('webm')) return '.webm';
  return '.bin';
};

const materializeRemoteFile = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar áudio remoto: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const tempFile = path.join(os.tmpdir(), `${randomUUID()}${extensionFromMimeType(contentType)}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(tempFile, buffer);
  return tempFile;
};

const materializeDataUri = (dataUri) => {
  const matches = String(dataUri).match(/^data:([^;]+);base64,(.+)$/i);
  if (!matches) {
    throw new Error('Data URI de áudio inválida');
  }

  const [, mimeType, base64Data] = matches;
  const tempFile = path.join(os.tmpdir(), `${randomUUID()}${extensionFromMimeType(mimeType)}`);
  fs.writeFileSync(tempFile, base64Data, 'base64');
  return tempFile;
};

const materializeAudioSource = async (sourceUrl) => {
  if (!sourceUrl || typeof sourceUrl !== 'string') {
    throw new Error('URL do áudio inválida');
  }

  if (/^data:[^;]+;base64,/i.test(sourceUrl)) {
    return { filePath: materializeDataUri(sourceUrl), cleanup: true };
  }

  const localUploadPath = getLocalUploadPath(sourceUrl);
  if (localUploadPath && fs.existsSync(localUploadPath)) {
    return { filePath: localUploadPath, cleanup: false };
  }

  if (/^https?:\/\//i.test(sourceUrl)) {
    return { filePath: await materializeRemoteFile(sourceUrl), cleanup: true };
  }

  if (fs.existsSync(sourceUrl)) {
    return { filePath: sourceUrl, cleanup: false };
  }

  throw new Error('Não foi possível acessar o arquivo de áudio informado');
};

const transcodeToPublicOgg = async (inputPath, { req, sourceUrl } = {}) => {
  const audioDir = path.join(UPLOAD_DIR, 'audio');
  ensureDir(audioDir);

  const outputFilename = `${Date.now()}-${randomUUID()}.ogg`;
  const outputPath = path.join(audioDir, outputFilename);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '96k',
    outputPath,
  ]);

  const publicBaseUrl = getPublicBaseUrl({ req, sourceUrl });
  if (!publicBaseUrl) {
    throw new Error('Configure API_BASE_URL, API_PUBLIC_URL ou PUBLIC_BASE_URL para gerar a URL pública do áudio');
  }

  return `${publicBaseUrl}/api/uploads/audio/${outputFilename}`;
};

const prepareAudioForEvolutionUrl = async (sourceUrl, options = {}) => {
  const { filePath, cleanup } = await materializeAudioSource(sourceUrl);

  try {
    const publicUrl = await transcodeToPublicOgg(filePath, { ...options, sourceUrl });
    console.log(`[AudioTranscoder] Audio convertido para OGG público: ${publicUrl}`);
    return publicUrl;
  } finally {
    if (cleanup && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

module.exports = { prepareAudioForEvolutionUrl };