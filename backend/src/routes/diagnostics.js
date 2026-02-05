const express = require('express');
const dns = require('dns');
const { promisify } = require('util');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve);

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/diagnostics/dns?host=example.com
router.get('/dns', async (req, res) => {
  const { host } = req.query;

  if (!host) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetro "host" é obrigatório',
    });
  }

  const results = {
    host,
    timestamp: new Date().toISOString(),
    dns: { success: false, error: null, addresses: null, latencyMs: null },
    fetch: { success: false, error: null, status: null, latencyMs: null },
  };

  // 1) DNS Lookup
  const dnsStart = Date.now();
  try {
    const addresses = await dnsResolve(host);
    results.dns.success = true;
    results.dns.addresses = addresses;
    results.dns.latencyMs = Date.now() - dnsStart;
  } catch (err) {
    results.dns.error = {
      code: err.code,
      syscall: err.syscall,
      message: err.message,
    };
    results.dns.latencyMs = Date.now() - dnsStart;
  }

  // 2) HTTP Fetch (simple GET to root)
  const fetchStart = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`https://${host}/`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'FormBuilder-Diagnostics/1.0' },
    });

    clearTimeout(timeout);
    results.fetch.success = true;
    results.fetch.status = response.status;
    results.fetch.latencyMs = Date.now() - fetchStart;
  } catch (err) {
    results.fetch.error = {
      name: err.name,
      code: err.cause?.code || null,
      message: err.message,
    };
    results.fetch.latencyMs = Date.now() - fetchStart;
  }

  res.json({ success: true, data: results });
});

// GET /api/diagnostics/health - simple health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

module.exports = router;
