export const config = { runtime: 'edge' };

// ── RATE LIMITING ───────────────────────────────────────────────────────
// Máx 10 análisis por IP en 5 minutos.
// La Map vive en memoria del isolate — protección básica pero efectiva.
const rateLimitStore = new Map();
const RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const RATE_MAX = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  entry.count++;

  // Limpiar entradas caducadas ocasionalmente
  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  return entry.count <= RATE_MAX;
}

// ── HANDLER ─────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Rate limit por IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Demasiadas peticiones. Espera unos minutos e inténtalo de nuevo.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400 });
  }

  const { image, prompt, mediaType } = body;
  if (!image || !prompt) {
    return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
  }

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
      return new Response(JSON.stringify({ error: 'Error IA', detalle: err }), { status: 500 });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
