# ATOM X · Color Picker — Handoff para desarrollo nativo / App Store

## Qué es esta app

Aplicación para uso en tienda física de material para tatuajes (ATOM X Supply).
El tatuador o el cliente sube una foto de un diseño, la IA detecta los colores del tatuaje
(filtrando la piel de la persona), identifica el estilo artístico y recomienda las tintas
Eternal Ink exactas que necesita — con dos opciones por color por si alguna no está disponible.

## Stack actual (versión web local)

- **Frontend:** HTML + CSS + JavaScript vanilla. Todo en un único archivo `index.html`.
- **Backend:** Vercel Edge Function (`api/analyze.js`) que actúa de proxy hacia la API de Anthropic (Claude).
- **IA:** Claude Haiku (claude-haiku-4-5-20251001) via API de Anthropic.
- **Despliegue actual:** Vercel (producción) + `vercel dev` en local para uso en tablet por WiFi.

## Archivos que recibe

```
index.html         → toda la app: UI, lógica, catálogo de tintas, análisis de imagen
api/analyze.js     → proxy backend hacia Claude API
package.json       → solo { "type": "module" }
vercel.json        → headers CSP para Vercel
```

## Variable de entorno necesaria

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxx
```
El propietario la tiene en su cuenta de Anthropic (console.anthropic.com).
En producción va en las variables de entorno del servidor, NUNCA en el código.

## Cómo funciona la IA

1. El usuario sube una foto (o hace foto con la cámara)
2. El frontend extrae los colores dominantes del diseño usando Canvas API + espacio de color HSL
3. Se filtran automáticamente los tonos de piel humana de la persona (para no confundirlos con colores del tatuaje)
4. Se envía la imagen + colores extraídos + tono de piel del cliente + prompt técnico a Claude
5. Claude devuelve JSON con: estilo detectado, colores en el diseño, tintas recomendadas (2 opciones por color con zona y función: base/sombra/transición/luz/línea)
6. El frontend renderiza los resultados con precio de cada tinta

## Catálogo de tintas

Está hardcodeado en `index.html` como objeto JS `catalogo`. Son ~170 tintas Eternal Ink
organizadas por categoría (negros, grises, blancos, rojos, rosas, morados, naranjas,
amarillos, verdes, azules, pieles, marrones, especiales). Son exactamente los productos
que tiene en stock la tienda. Si cambia el stock, hay que actualizar ese objeto.

## Lo que queremos para App Store / desarrollo nativo

### Funcionalidades que debe mantener
- [ ] Selección de tono de piel del cliente (Fitzpatrick I-V) — se bloquea al subir imagen
- [ ] Subir imagen desde galería O hacer foto directa con cámara
- [ ] Análisis de colores con IA (Claude API)
- [ ] Detección de estilo del tatuaje
- [ ] Recomendación de tintas por zona y función (base, sombra, transición, luz, línea)
- [ ] 2 opciones de tinta por cada color
- [ ] Precio de cada tinta
- [ ] Botón "Ver en atomxsupply.com" para cada tinta
- [ ] Personaje ATOM X animado (SVG con expresiones)
- [ ] Contador de análisis realizados
- [ ] Modo offline parcial (catálogo de tintas disponible sin internet, análisis IA requiere conexión)

### Mejoras deseadas para la versión nativa

#### CUENTAS DE USUARIO
- [ ] Registro e inicio de sesión (email + contraseña mínimo, Google/Apple opcional)
- [ ] Cada usuario tiene su perfil con historial de análisis guardados
- [ ] Los resultados (imagen, estilo detectado, tintas recomendadas) se guardan por usuario
- [ ] El tatuador puede ver el historial de un cliente si este se lo comparte

#### LEGAL — OBLIGATORIO PARA APP STORE / EUROPE (RGPD)
- [ ] Pantalla de bienvenida con aceptación de Términos y Política de Privacidad ANTES de registrarse
- [ ] Pantalla de permisos de notificaciones con opción clara de RECHAZAR (requerido por Apple y RGPD)
- [ ] La app NO puede recopilar datos si el usuario no acepta explícitamente
- [ ] Opción de eliminar la cuenta y todos los datos asociados (derecho al olvido RGPD)
- [ ] Opción de exportar los propios datos (derecho de portabilidad RGPD)
- [ ] Las imágenes subidas NO deben almacenarse en servidor sin consentimiento explícito
- [ ] Aviso de cookies / tracking si se usa cualquier analítica
- [ ] Páginas obligatorias dentro de la app:
  - Política de Privacidad
  - Términos y Condiciones de Uso
  - Aviso Legal (datos del titular, domicilio, CIF)
  - Política de Cookies
- [ ] Estas páginas también deben estar en la web atomxsupply.com (Apple las verifica)
- [ ] El consentimiento debe quedar registrado con fecha y versión aceptada

#### LICENCIAS Y REQUISITOS APPLE
- [ ] Privacy Nutrition Label en App Store (declarar qué datos se recogen y para qué)
- [ ] Justificar uso de la cámara con texto claro en Info.plist: "Para analizar el diseño del tatuaje"
- [ ] Justificar acceso a galería de fotos en Info.plist
- [ ] No usar APIs o SDKs de terceros sin declarar en la Privacy Label
- [ ] Si se usan notificaciones push: flujo de solicitud de permiso correcto (nunca forzar)
- [ ] La app debe funcionar SIN cuenta (modo invitado limitado) — Apple lo exige para apps que requieren registro
- [ ] Licencia de las tipografías usadas (Space Mono: SIL Open Font License ✓, DM Sans: SIL Open Font License ✓)
- [ ] Cumplir App Store Review Guidelines 5.1.1 (privacidad de datos)

#### RESTO DE MEJORAS
- [ ] Historial de análisis guardados por usuario en la nube
- [ ] Compartir resultado por WhatsApp al cliente
- [ ] Catálogo de tintas navegable con fotos reales
- [ ] Posibilidad de actualizar el catálogo sin actualizar la app (CMS o JSON remoto)
- [ ] Modo kiosko para tablet en tienda (pantalla siempre encendida, sin salir de la app)
- [ ] Soporte para múltiples idiomas (ES, EN mínimo)
- [ ] Integración futura con stock real de Prestashop via API

### Plataformas objetivo
- iOS (App Store) — uso principal en iPad en tienda
- Android (Google Play) — secundario

### Tecnologías sugeridas para versión nativa
- React Native / Expo — reutiliza lógica JS actual
- O Flutter si el programador lo prefiere
- El backend (proxy Claude) puede quedarse en Vercel o migrar a cualquier servidor Node.js

## Diseño / identidad visual

- Fondo oscuro `#0a0a0a`
- Acento naranja `#ff4d00`
- Tipografías: Space Mono (monospace) + DM Sans
- Estilo: dark, premium, táctil — pensado para tablet
- El personaje ATOM X es un SVG con órbitas animadas y expresiones faciales que cambian según el estado

## Contacto / propietario

ATOM X Supply — tienda de material para tatuajes
Web: atomxsupply.com
