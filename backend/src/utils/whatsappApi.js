/**
 * Camada de abstração para provedores de WhatsApp.
 *
 * Suporta:
 *  - evolution (Evolution API v2) -> padrão / legado
 *  - uazapi    (uazapiGO v2 - https://docs.uazapi.com/)
 *
 * A ideia é manter o "dialeto" da Evolution API como formato interno
 * (endpoints /message/sendText, /message/sendMedia, /message/sendWhatsAppAudio)
 * e traduzir para a UAZAPI quando a instância estiver marcada como tal.
 */

const normalizeUrl = (url) => {
  if (!url) return '';
  return String(url).trim().replace(/\/+$/, '');
};

const getProvider = (instance) => {
  const p = (instance && (instance.provider || instance.api_provider) || 'evolution').toString().toLowerCase();
  return p === 'uazapi' ? 'uazapi' : 'evolution';
};

const getBaseUrl = (instance) => normalizeUrl(instance.api_url);

const getAuthHeaders = (instance) => {
  const key = (instance.api_key || '').trim();
  if (getProvider(instance) === 'uazapi') {
    return { 'Content-Type': 'application/json', token: key };
  }
  return { 'Content-Type': 'application/json', apikey: key, Connection: 'close' };
};

/**
 * Traduz um par (endpoint Evolution, payload Evolution) para a UAZAPI.
 * Retorna { method, path, body }.
 */
const translateToUazapi = (endpoint, payload = {}) => {
  const ep = (endpoint || '').split('?')[0];
  const number = payload.number;
  const delay = payload.delay;

  if (ep.startsWith('/message/sendText')) {
    const body = { number, text: payload.text };
    if (delay) body.delay = delay;
    if (payload.replyid) body.replyid = payload.replyid;
    return { method: 'POST', path: '/send/text', body };
  }

  if (ep.startsWith('/message/sendWhatsAppAudio')) {
    const body = { number, type: 'ptt', file: payload.audio };
    if (delay) body.delay = delay;
    return { method: 'POST', path: '/send/media', body };
  }

  if (ep.startsWith('/message/sendMedia')) {
    const type = payload.mediatype || payload.mediaType || 'image';
    const body = {
      number,
      type: type === 'document' ? 'document' : type,
      file: payload.media,
    };
    if (payload.caption) body.text = payload.caption;
    if (payload.fileName) body.docName = payload.fileName;
    if (payload.mimetype) body.mimetype = payload.mimetype;
    if (delay) body.delay = delay;
    return { method: 'POST', path: '/send/media', body };
  }

  if (ep.startsWith('/message/presence') || ep.startsWith('/chat/sendPresence')) {
    return {
      method: 'POST',
      path: '/message/presence',
      body: { number, presence: payload.presence || 'composing', delay: delay || 2000 },
    };
  }

  if (ep.startsWith('/instance/connectionState') || ep.startsWith('/instance/fetchInstances')) {
    return { method: 'GET', path: '/instance/status', body: null };
  }

  if (ep.startsWith('/instance/connect')) {
    return { method: 'POST', path: '/instance/connect', body: {} };
  }

  if (ep.startsWith('/instance/logout')) {
    return { method: 'POST', path: '/instance/disconnect', body: {} };
  }

  // Fallback: repassa o endpoint como está
  return { method: 'POST', path: ep, body: payload };
};

/**
 * Executa uma requisição no provedor correto.
 * @returns {Promise<{ok:boolean,status:number,data:any}>}
 */
const callWhatsAppApi = async (instance, endpoint, payload = null, options = {}) => {
  const provider = getProvider(instance);
  const baseUrl = getBaseUrl(instance);
  const instanceName = (instance.name || '').trim();

  let url;
  let method = options.method || (payload ? 'POST' : 'GET');
  let body = payload;

  if (provider === 'uazapi') {
    const t = translateToUazapi(endpoint, payload || {});
    url = `${baseUrl}${t.path}`;
    method = options.method || t.method;
    body = t.body;
  } else {
    // Evolution: o nome da instância vai no path
    const needsInstance = !endpoint.includes(`/${instanceName}`);
    url = `${baseUrl}${endpoint}${needsInstance && instanceName ? `/${instanceName}` : ''}`;
  }

  console.log(`[WA:${provider}] ${method} ${url}`);

  const res = await fetch(url, {
    method,
    headers: { ...getAuthHeaders(instance), ...(options.headers || {}) },
    ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data, provider, url, sentBody: body };
};

/**
 * Igual a callWhatsAppApi, mas lança erro quando a resposta não é OK.
 */
const callWhatsAppApiOrThrow = async (instance, endpoint, payload = null, options = {}) => {
  let result;
  try {
    result = await callWhatsAppApi(instance, endpoint, payload, options);
  } catch (error) {
    const baseUrl = getBaseUrl(instance);
    if (error.cause && error.cause.code === 'ECONNREFUSED') {
      error.message = `Conexão recusada em ${baseUrl}. Verifique se a URL está correta e o servidor está rodando.`;
    } else if (error.cause && error.cause.code === 'ENOTFOUND') {
      error.message = `Não foi possível encontrar o servidor em ${baseUrl}. Verifique o DNS ou IP.`;
    } else if (error.message && error.message.includes('fetch failed')) {
      error.message = `Falha na conexão com ${baseUrl}. Verifique firewall, URL incorreta ou servidor offline.`;
    }
    error.details = { message: error.message, url: baseUrl, code: error.code };
    throw error;
  }

  if (!result.ok) {
    const d = result.data || {};
    const msg =
      d.message ||
      d.error ||
      (Array.isArray(d.errors) && d.errors[0] && (d.errors[0].message || d.errors[0].error_message)) ||
      `HTTP ${result.status}`;
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    err.details = { status: result.status, response: result.data, url: result.url };
    throw err;
  }

  return result.data;
};

module.exports = {
  normalizeUrl,
  getProvider,
  getBaseUrl,
  getAuthHeaders,
  translateToUazapi,
  callWhatsAppApi,
  callWhatsAppApiOrThrow,
};
