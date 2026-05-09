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
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON invalido' }, 400);
  }

  const { image, prompt, mediaType } = body;
  if (!image || !prompt) {
    return json({ error: 'Faltan datos' }, 400);
  }

  const baseUrl = resolveOpsBaseUrl(req);

  try {
    if (baseUrl) {
      const response = await fetch(`${baseUrl}/api/public/design/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
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
        return json({ error: 'Error IA (OPS)', detalle: data }, response.status);
      }

      return json(data, 200);
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return json({ error: 'ATOMX_OPS_API_URL y ANTHROPIC_API_KEY no configuradas' }, 503);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return json({ error: 'Error IA', detalle: data }, 500);
    }

    return json(data, 200);
  } catch (err) {
    return json({ error: err?.message || 'Error IA (OPS)' }, 500);
  }
}
