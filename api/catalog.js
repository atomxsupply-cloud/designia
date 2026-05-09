export const config = { runtime: 'edge' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function resolveOpsBaseUrl(req) {
  const configured = String(process.env.ATOMX_OPS_API_URL || '').replace(/\/+$/, '');
  if (configured) return configured;

  try {
    const host = new URL(req.url || 'http://localhost').hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:3001';
    }
  } catch {}

  return '';
}

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const baseUrl = resolveOpsBaseUrl(req);
  if (!baseUrl) {
    return json({ error: 'ATOMX_OPS_API_URL no configurada' }, 503);
  }

  try {
    const response = await fetch(`${baseUrl}/api/public/design/tintas`, {
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
      return json(
        { error: 'No he podido traer el catalogo de OPS', detalle: data },
        response.status
      );
    }

    return json(data, 200);
  } catch (error) {
    return json({ error: error.message || 'Error cargando catalogo' }, 500);
  }
}
