/**
 * ATOM X Supply — Contador global de análisis
 * GET  /api/counter  → devuelve el contador actual
 * POST /api/counter  → incrementa y devuelve el nuevo valor
 *
 * Requiere Vercel KV configurado en el dashboard de Vercel.
 * Si KV no está disponible, responde con { count: 0 } y el cliente
 * usa el contador local como fallback (no falla la app).
 *
 * Setup: https://vercel.com/docs/storage/vercel-kv/quickstart
 */
import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const KEY = 'atomx_global_count';

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HEADERS });
  }

  try {
    if (req.method === 'GET') {
      const count = (await kv.get(KEY)) || 0;
      return new Response(JSON.stringify({ count: Number(count) }), { headers: HEADERS });
    }

    if (req.method === 'POST') {
      const count = await kv.incr(KEY);
      return new Response(JSON.stringify({ count }), { headers: HEADERS });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch {
    // KV no configurado — el cliente usará contador local como fallback
    return new Response(JSON.stringify({ count: 0 }), { status: 200, headers: HEADERS });
  }
}
