import http from 'node:http';
import { appendFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRESENCE_TTL_MS = 2 * 60 * 1000;
const presenceMap = new Map();

function parseArgs(argv) {
  const args = { port: 3002, root: null };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--port') args.port = Number(argv[i + 1] || 3002);
    if (token === '--root') args.root = String(argv[i + 1] || '').trim() || null;
  }
  return args;
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function badRequest(res, message) {
  json(res, 400, { error: message });
}

function methodNotAllowed(res) {
  json(res, 405, { error: 'Method not allowed' });
}

function guessType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.ico') return 'image/x-icon';
  return 'application/octet-stream';
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function handleCatalog(req, res, opsBaseUrl) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  try {
    const response = await fetch(`${opsBaseUrl.replace(/\/+$/, '')}/api/public/design/tintas`, {
      headers: { Accept: 'application/json' },
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!response.ok) {
      return json(res, response.status, { error: 'No he podido traer el catalogo de OPS', detalle: data });
    }
    return json(res, 200, data);
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Error cargando catalogo' });
  }
}

async function handleAnalyze(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  const body = await readBody(req);
  if (!body) return badRequest(res, 'JSON invalido');
  const { image, prompt, mediaType } = body;
  if (!image || !prompt) return badRequest(res, 'Faltan datos');

  // Centralizamos IA en OPS: Design no guarda keys.
  // OPS expone un endpoint publico que ya valida ANTHROPIC_API_KEY en el backend.
  const opsUrl = `${opsBaseUrl.replace(/\/+$/, '')}/api/public/design/analyze`;
  try {
    const response = await fetch(opsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ image, prompt, mediaType }),
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return json(res, response.status, { error: 'Error IA (OPS)', detalle: data });
    }

    return json(res, 200, data);
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Error IA (OPS)' });
  }
}

async function handleFeedback(req, res, opsBaseUrl, url) {
  const targetBase = `${opsBaseUrl.replace(/\/+$/, '')}/api/public/design/feedback`;

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${targetBase}?limit=${encodeURIComponent(url.searchParams.get('limit') || '5')}`, {
        headers: { Accept: 'application/json' },
      });
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      return json(res, response.status, data);
    }

    if (req.method !== 'POST') return methodNotAllowed(res);

    const body = await readBody(req);
    if (!body) return badRequest(res, 'JSON invalido');

    const response = await fetch(targetBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    return json(res, response.status, data);
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Error guardando feedback' });
  }
}

async function handlePresence(req, res) {
  try {
    const now = Date.now();
    for (const [name, meta] of presenceMap.entries()) {
      if (!meta?.lastSeen || now - meta.lastSeen > PRESENCE_TTL_MS) {
        presenceMap.delete(name);
      }
    }

    if (req.method === 'GET') {
      const items = [...presenceMap.entries()]
        .map(([name, meta]) => ({
          name,
          lastSeen: meta.lastSeen,
          at: new Date(meta.lastSeen).toISOString(),
        }))
        .sort((a, b) => b.lastSeen - a.lastSeen);
      return json(res, 200, { items });
    }

    if (req.method !== 'POST') return methodNotAllowed(res);
    const body = await readBody(req);
    const name = String(body?.name || '').trim().slice(0, 32);
    if (!name) return badRequest(res, 'Falta nombre');
    presenceMap.set(name, { lastSeen: now });
    return json(res, 200, { ok: true, name, online: presenceMap.size });
  } catch (err) {
    return json(res, 500, { error: err?.message || 'Error presence' });
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const atomFeedbackDir = path.join(__dirname, 'data', 'atom-feedback');

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

async function handleAtomFeedback(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const body = await readBody(req);
  if (!body) return badRequest(res, 'JSON invalido');

  const cleanNombre = String(body?.nombre_tatuador || '').trim();
  const cleanColores = String(body?.eleccion_colores_correcta || '').trim().toLowerCase();
  const cleanTintas = String(body?.tintas_vistas || '').trim();
  const cleanPrecio = String(body?.precio_aprox_app || '').trim();
  const cleanApariencia = String(body?.apariencia_app || '').trim();
  const cleanMejoras = String(body?.posibles_mejoras || '').trim();
  const cleanUtil = String(body?.te_parece_util || '').trim().toLowerCase();

  if (!cleanNombre || !cleanColores || !cleanApariencia || !cleanUtil) {
    return badRequest(res, 'Faltan respuestas obligatorias');
  }

  if (!['si', 'no'].includes(cleanColores) || !['si', 'no'].includes(cleanUtil)) {
    return badRequest(res, 'Los campos si/no no son validos');
  }

  const now = new Date();
  const iso = now.toISOString();
  const dateKey = iso.slice(0, 10);
  const stamp = iso.replace(/[:.]/g, '-');
  const payload = {
    submitted_at: iso,
    nombre_tatuador: cleanNombre,
    eleccion_colores_correcta: cleanColores,
    tintas_vistas: cleanTintas || null,
    precio_aprox_app: cleanPrecio || null,
    apariencia_app: cleanApariencia,
    posibles_mejoras: cleanMejoras || null,
    te_parece_util: cleanUtil,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
    user_agent: req.headers['user-agent'] || null,
  };

  try {
    await mkdir(atomFeedbackDir, { recursive: true });
    const jsonPath = path.join(atomFeedbackDir, `${dateKey}.jsonl`);
    const csvPath = path.join(atomFeedbackDir, `${dateKey}.csv`);
    const entryPath = path.join(atomFeedbackDir, `${stamp}.json`);

    try {
      await stat(csvPath);
    } catch {
      await writeFile(
        csvPath,
        'submitted_at,nombre_tatuador,eleccion_colores_correcta,tintas_vistas,precio_aprox_app,apariencia_app,posibles_mejoras,te_parece_util,ip,user_agent\n',
        'utf8',
      );
    }

    await writeFile(entryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await appendFile(jsonPath, `${JSON.stringify(payload)}\n`, 'utf8');
    await appendFile(
      csvPath,
      [
        payload.submitted_at,
        payload.nombre_tatuador,
        payload.eleccion_colores_correcta,
        payload.tintas_vistas,
        payload.precio_aprox_app,
        payload.apariencia_app,
        payload.posibles_mejoras,
        payload.te_parece_util,
        payload.ip,
        payload.user_agent,
      ].map(csvEscape).join(',') + '\n',
      'utf8',
    );

    return json(res, 200, { ok: true, file: path.basename(entryPath) });
  } catch (err) {
    return json(res, 500, { error: err?.message || 'No se pudo guardar el feedback interno' });
  }
}

async function handleAtomFeedbackResponses(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  try {
    await mkdir(atomFeedbackDir, { recursive: true });
    const files = (await readdir(atomFeedbackDir))
      .filter((name) => name.endsWith('.json'))
      .sort()
      .reverse();

    const items = await Promise.all(
      files.slice(0, 300).map(async (name) => {
        const raw = await readFile(path.join(atomFeedbackDir, name), 'utf8');
        return JSON.parse(raw);
      }),
    );

    const countBy = (key) => items.reduce((acc, item) => {
      const value = String(item?.[key] || 'sin-dato');
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});

    return json(res, 200, {
      ok: true,
      total: items.length,
      latest: items.slice(0, 40),
      summary: {
        eleccion_colores_correcta: countBy('eleccion_colores_correcta'),
        te_parece_util: countBy('te_parece_util'),
        apariencia_app: countBy('apariencia_app'),
      },
    });
  } catch (err) {
    return json(res, 500, { error: err?.message || 'No se pudieron leer las respuestas' });
  }
}

async function serveFile(res, root, urlPath) {
  const safePath = urlPath.split('?')[0].split('#')[0];
  const rel = safePath === '/' ? '/index.html' : safePath;
  const resolved = path.join(root, rel);
  const rootResolved = path.resolve(root);
  const resolvedAbs = path.resolve(resolved);
  if (!resolvedAbs.startsWith(rootResolved)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const st = await stat(resolvedAbs);
    if (st.isDirectory()) {
      const indexPath = path.join(resolvedAbs, 'index.html');
      const buf = await readFile(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buf);
      return;
    }
    const buf = await readFile(resolvedAbs);
    res.writeHead(200, { 'Content-Type': guessType(resolvedAbs), 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch {
    // SPA fallback
    try {
      const buf = await readFile(path.join(root, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buf);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}
const args = parseArgs(process.argv.slice(2));
const root = args.root || __dirname;
const port = Number(args.port || 3002);
const opsBaseUrl = String(process.env.ATOMX_OPS_API_URL || 'http://127.0.0.1:3001').trim();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/health') return json(res, 200, { ok: true });
  if (url.pathname === '/api/catalog') return handleCatalog(req, res, opsBaseUrl);
  if (url.pathname === '/api/analyze') return handleAnalyze(req, res);
  if (url.pathname === '/api/feedback') return handleFeedback(req, res, opsBaseUrl, url);
  if (url.pathname === '/api/presence') return handlePresence(req, res);
  if (url.pathname === '/api/atom-feedback') return handleAtomFeedback(req, res);
  if (url.pathname === '/api/atom-feedback/responses') return handleAtomFeedbackResponses(req, res);
  return serveFile(res, root, url.pathname);
});

server.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`ATOM X Design corriendo en puerto ${port} (root ${root})`);
});
