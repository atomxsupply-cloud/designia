# ATOM X Design — Base de desarrollo

## Qué es esto
App para tablet en tienda física. El cliente sube o hace foto de un diseño de tatuaje,
la IA detecta los colores dominantes y recomienda qué tintas Eternal usar según su tono de piel.

## Cómo arrancar en local
1. Abrir terminal en VSCode
2. `cd "c:/Users/34675/proyecto ia atom x/02-atomx-design"`
3. `npx vercel dev --listen 0.0.0.0:3000`
4. Desde tablet (misma WiFi): `http://192.168.0.42:3000`

## Stack
- HTML + JS vanilla, todo en `index.html`
- Backend: `api/analyze.js` — Vercel Edge Function → Claude Haiku (Anthropic)
- Variables de entorno: `.env.local` (no subir a git)

## Estado actual (abril 2026)
- Funciona en tablet vía WiFi local
- Detecta colores dominantes con Canvas
- Selector de tono de piel Fitzpatrick I-VI
- Personaje ATOM X animado
- Recomendación de tintas Eternal por IA

## Pendiente / ideas futuras
- [x] Mejorar extracción de colores: HSL bucketing + distancia perceptual
- [x] Pre-clasificar colores a categoría de tinta antes de enviar a Claude
- [x] Prompt con reglas colorimetría específicas para tatuaje (rojos, melanina, etc.)
- [ ] Catálogo de tintas con fotos reales
- [ ] Historial de consultas
- [ ] Conectar con stock real de Prestashop
- [ ] Bot WhatsApp para enviar recomendación al cliente
