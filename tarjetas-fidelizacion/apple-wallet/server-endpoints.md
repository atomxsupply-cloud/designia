# Endpoints del servidor — Apple Wallet

Apple requiere que tu servidor implemente estos endpoints bajo `webServiceURL`:

## 1. Registro del dispositivo
`POST /api/wallet/v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}`
- Apple llama esto cuando el cliente añade el pase
- Debes guardar: `deviceId`, `pushToken` y `serialNumber` en tu BD

## 2. Baja del dispositivo
`DELETE /api/wallet/v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}`
- Cuando el cliente elimina el pase de su wallet

## 3. Obtener pase actualizado
`GET /api/wallet/v1/passes/{passTypeId}/{serialNumber}`
- Apple llama esto después de recibir el push
- Debes devolver el `.pkpass` actualizado firmado

## 4. Pases modificados
`GET /api/wallet/v1/devices/{deviceId}/registrations/{passTypeId}?passesUpdatedSince=...`
- Devuelve los seriales de pases modificados

---

## Flujo para añadir un sello desde tu panel

```
1. Tu panel llama a:  POST /api/wallet/admin/sello?cliente=ID
2. Tu servidor:
   a. Incrementa sellos en BD
   b. Busca el pushToken del cliente
   c. Envía push via APNs (librería: apn o node-apn)
3. El iPhone recibe el push → llama a endpoint 3 → descarga pase nuevo
4. El cliente ve el sello actualizado
```

---

## Librería recomendada

```bash
npm install passkit-generator
npm install @parse/node-apn
```
