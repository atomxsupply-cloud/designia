/**
 * ATOM X Design — Servidor Express para hosting propio
 *
 * Uso:
 *   npm install
 *   node server.js          (producción)
 *   node --watch server.js  (desarrollo con auto-reload)
 *
 * Variable de entorno necesaria:
 *   ANTHROPIC_API_KEY=sk-ant-xxxxxx  →  en archivo .env
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { config } from 'dotenv';

config(); // carga .env

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta data/ para persistir contador y logs (no va a git)
const DATA_DIR = join(__dirname, 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '15mb' }));

// Sirve index.html y archivos estáticos
app.use(express.static(__dirname, {
  index: 'index.html',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// ── RATE LIMITING ────────────────────────────────────────────────────────
// Máx 10 análisis por IP en 5 minutos
const rateLimitStore = new Map();
const RATE_WINDOW = 5 * 60 * 1000;
const RATE_MAX = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  entry.count++;
  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore) if (now > v.resetAt) rateLimitStore.delete(k);
  }
  return entry.count <= RATE_MAX;
}

// ── POST /api/analyze — Análisis de imagen con Claude ───────────────────
app.post('/api/analyze', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Demasiadas peticiones. Espera unos minutos e inténtalo de nuevo.' });
  }

  const { image, prompt, mediaType } = req.body;
  if (!image || !prompt) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Error IA', detalle: err });
    }

    res.json(await response.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET/POST /api/counter — Contador global de análisis ─────────────────
const COUNTER_FILE = join(DATA_DIR, 'counter.json');

function readCounter() {
  try { return JSON.parse(readFileSync(COUNTER_FILE, 'utf8')).count || 0; } catch { return 0; }
}
function saveCounter(n) {
  writeFileSync(COUNTER_FILE, JSON.stringify({ count: n }), 'utf8');
}

app.get('/api/counter', (req, res) => res.json({ count: readCounter() }));

app.post('/api/counter', (req, res) => {
  const count = readCounter() + 1;
  saveCounter(count);
  res.json({ count });
});

// ── POST /api/log — Historial mental → ATOMX OPS ────────────────────────
const LOGS_FILE = join(DATA_DIR, 'logs.json');
const MAX_LOGS = 1000;

function readLogs() {
  try { return JSON.parse(readFileSync(LOGS_FILE, 'utf8')); } catch { return []; }
}
function saveLogs(logs) {
  writeFileSync(LOGS_FILE, JSON.stringify(logs), 'utf8');
}

app.post('/api/log', (req, res) => {
  const { estilo, skin, colores, tintas, categorias } = req.body;
  const logs = readLogs();
  logs.unshift({
    ts: Date.now(),
    estilo: estilo || null,
    skin: skin || null,
    colores: (colores || []).slice(0, 6).map(c => ({ hex: c.hex, pct: c.porcentaje })),
    tintas: (tintas || []).map(t => t.opcion1?.tinta).filter(Boolean),
    categorias: categorias || []
  });
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  saveLogs(logs);
  res.json({ ok: true });
});

// ── GET /api/log — Estadísticas ATOMX OPS ───────────────────────────────
app.get('/api/log', (req, res) => {
  const logs = readLogs();
  const estiloCount = {}, tintaCount = {}, catCount = {};
  const skinCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const log of logs) {
    if (log.estilo) estiloCount[log.estilo] = (estiloCount[log.estilo] || 0) + 1;
    if (log.skin)   skinCount[log.skin]   = (skinCount[log.skin]   || 0) + 1;
    for (const t of log.tintas    || []) tintaCount[t] = (tintaCount[t] || 0) + 1;
    for (const c of log.categorias || []) catCount[c]  = (catCount[c]  || 0) + 1;
  }

  const top = (obj, n) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
      .map(([nombre, count]) => ({ nombre, count }));

  res.json({
    total: logs.length,
    ultimos: logs.slice(0, 10),
    stats: {
      estilos_top:         top(estiloCount, 8),
      tintas_top:          top(tintaCount, 10),
      categorias_top:      top(catCount, 8),
      skin_distribucion:   skinCount
    }
  });
});

// ── Arrancar servidor ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ATOM X Design · servidor corriendo`);
  console.log(`  → http://localhost:${PORT}\n`);
});
