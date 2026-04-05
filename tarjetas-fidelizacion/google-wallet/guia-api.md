# Guía: Google Wallet API

## Setup inicial

1. **Google Cloud Console** → https://console.cloud.google.com
   - Crear proyecto o usar el existente
   - Habilitar: **Google Wallet API**

2. **Crear cuenta de servicio**
   - IAM & Admin → Service Accounts → Crear
   - Descargar clave JSON (la usarás en el servidor)

3. **Google Pay & Wallet Console** → https://pay.google.com/business/console
   - Crear Issuer Account
   - Añadir tu cuenta de servicio como administrador

4. **Crear la Loyalty Class** (plantilla compartida por todos los clientes)
   ```bash
   POST https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass
   ```

5. **Crear un Loyalty Object por cliente**
   - Usar el `loyalty-object.json` de esta carpeta como base

---

## Flujo para añadir un sello

```
1. Tu panel llama a:  POST /api/wallet/admin/sello?cliente=ID
2. Tu servidor:
   PATCH https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{objectId}
   Body: { "loyaltyPoints": { "balance": { "int": NUEVO_NUMERO } } }
3. Google actualiza la tarjeta automáticamente
4. El cliente ve el sello en Google Wallet
```

---

## Librería recomendada

```bash
npm install googleapis
```

```js
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: 'service-account.json',
  scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
});
```
