# Tarjetas de Fidelización — ATOM X Design

Sistema de tarjetas de sellos digitales compatibles con **Apple Wallet** y **Google Wallet**.
Los sellos se gestionan remotamente desde el servidor sin que el cliente tenga que hacer nada.

---

## ¿Cómo funciona?

```
Cliente recibe tarjeta → la añade a su Wallet
Tú escaneas/das sello desde tu panel → API actualiza el pase → cliente ve el sello al instante
```

---

## Estructura

```
tarjetas-fidelizacion/
├── apple-wallet/
│   ├── pass-template.json       # Plantilla del pase .pkpass
│   ├── server-endpoints.md      # Endpoints que debes implementar
│   └── guia-certificados.md     # Cómo obtener los certificados de Apple
├── google-wallet/
│   ├── loyalty-object.json      # Plantilla del objeto de fidelización
│   └── guia-api.md              # Cómo configurar Google Wallet API
└── api/
    └── stamp-server.js          # Ejemplo de servidor Node.js para dar sellos
```

---

## Requisitos

| Plataforma     | Requisito                          | Coste        |
|----------------|------------------------------------|--------------|
| Apple Wallet   | Apple Developer Account            | $99/año      |
| Google Wallet  | Google Cloud Project + Wallet API  | Gratis       |

---

## Tecnologías sugeridas

- **Backend:** Node.js (ya tienes `api/` en el proyecto)
- **Apple:** librería `passkit-generator` (npm)
- **Google:** `googleapis` (npm) + JWT
- **Base de datos:** Para guardar tokens de pases por cliente
