/**
 * ATOM X Supply — Historial mental → ATOMX OPS
 *
 * Registra cada análisis realizado para generar insights:
 * - Estilos más solicitados
 * - Tintas más recomendadas
 * - Distribución de tonos de piel de clientes
 * - Categorías de color más demandadas
 *
 * GET  /api/log          → últimos 50 registros + estadísticas agregadas
 * POST /api/log          → registra un nuevo análisis
 *
 * Requiere Vercel KV configurado. Falla silenciosamente si no está.
 */
import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json' };
const LOG_KEY = 'atomx_analysis_logs';
const MAX_LOGS = 1000;

export default async function handler(req) {
  // ── POST: guardar análisis ──────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch {
      return new Response('Bad request', { status: 400 });
    }

    const entry = {
      ts: Date.now(),
      estilo: body.estilo || null,
      skin: body.skin || null,                        // número Fitzpatrick 1-5
      colores: (body.colores || []).slice(0, 6).map(c => ({ hex: c.hex, pct: c.porcentaje })),
      tintas: (body.tintas || []).map(t => t.opcion1?.tinta).filter(Boolean),
      categorias: body.categorias || [],               // array de categorías usadas
    };

    try {
      await kv.lpush(LOG_KEY, JSON.stringify(entry));
      await kv.ltrim(LOG_KEY, 0, MAX_LOGS - 1);
    } catch {
      // KV no configurado — ignorar silenciosamente
    }

    return new Response(JSON.stringify({ ok: true }), { headers: HEADERS });
  }

  // ── GET: estadísticas para ATOMX OPS ───────────────────────────────
  if (req.method === 'GET') {
    try {
      const raw = await kv.lrange(LOG_KEY, 0, 49); // últimos 50
      const logs = raw.map(r => {
        try { return JSON.parse(r); } catch { return null; }
      }).filter(Boolean);

      // Estadísticas agregadas
      const estiloCount = {};
      const tintaCount = {};
      const skinCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const catCount = {};

      for (const log of logs) {
        if (log.estilo) estiloCount[log.estilo] = (estiloCount[log.estilo] || 0) + 1;
        if (log.skin) skinCount[log.skin] = (skinCount[log.skin] || 0) + 1;
        for (const t of log.tintas || []) tintaCount[t] = (tintaCount[t] || 0) + 1;
        for (const c of log.categorias || []) catCount[c] = (catCount[c] || 0) + 1;
      }

      const top = (obj, n) =>
        Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n)
          .map(([k, v]) => ({ nombre: k, count: v }));

      return new Response(JSON.stringify({
        total: logs.length,
        ultimos: logs.slice(0, 10),
        stats: {
          estilos_top: top(estiloCount, 8),
          tintas_top: top(tintaCount, 10),
          categorias_top: top(catCount, 8),
          skin_distribucion: skinCount,
        }
      }), { headers: HEADERS });

    } catch {
      return new Response(JSON.stringify({ total: 0, stats: {}, error: 'KV no configurado' }), { headers: HEADERS });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
