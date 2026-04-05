/**
 * ATOM X Design — API para dar sellos de fidelización
 * Compatible con Apple Wallet y Google Wallet
 *
 * npm install express passkit-generator googleapis @parse/node-apn
 */

const express = require('express');
const router = express.Router();

// ──────────────────────────────────────────────
// APPLE WALLET — Endpoints requeridos por Apple
// ──────────────────────────────────────────────

// Registro: cliente añade el pase a su wallet
router.post(
  '/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber',
  async (req, res) => {
    const { deviceId, serialNumber } = req.params;
    const { pushToken } = req.body;
    // TODO: guardar { deviceId, pushToken, serialNumber } en tu BD
    console.log('Dispositivo registrado:', { deviceId, serialNumber, pushToken });
    res.status(201).send();
  }
);

// Baja: cliente elimina el pase
router.delete(
  '/v1/devices/:deviceId/registrations/:passTypeId/:serialNumber',
  async (req, res) => {
    const { deviceId, serialNumber } = req.params;
    // TODO: eliminar de tu BD
    res.status(200).send();
  }
);

// Apple pide el pase actualizado tras recibir push
router.get('/v1/passes/:passTypeId/:serialNumber', async (req, res) => {
  const { serialNumber } = req.params;
  // TODO: generar y devolver el .pkpass actualizado para este serialNumber
  // Ejemplo con passkit-generator:
  //   const pass = await generarPase(serialNumber);
  //   res.type('application/vnd.apple.pkpass');
  //   pass.getAsStream().pipe(res);
  res.status(200).send('// Implementar generación de .pkpass');
});

// ──────────────────────────────────────────────
// ENDPOINT ADMIN — Dar un sello a un cliente
// ──────────────────────────────────────────────

/**
 * POST /api/wallet/admin/sello
 * Body: { clienteId, plataforma: 'apple' | 'google' | 'ambas' }
 * Requiere autenticación de tu panel admin
 */
router.post('/admin/sello', async (req, res) => {
  const { clienteId, plataforma = 'ambas' } = req.body;

  try {
    // 1. Obtener datos del cliente y sus sellos actuales
    // const cliente = await db.clientes.findById(clienteId);
    // const nuevosSelos = cliente.sellos + 1;
    const nuevosSelos = 1; // placeholder

    // 2. Actualizar Apple Wallet
    if (plataforma === 'apple' || plataforma === 'ambas') {
      // await actualizarAppleWallet(clienteId, nuevosSelos);
      console.log('Apple: sello enviado a', clienteId);
    }

    // 3. Actualizar Google Wallet
    if (plataforma === 'google' || plataforma === 'ambas') {
      // await actualizarGoogleWallet(clienteId, nuevosSelos);
      console.log('Google: sello enviado a', clienteId);
    }

    res.json({
      ok: true,
      clienteId,
      sellos: nuevosSelos,
      mensaje: `Sello #${nuevosSelos} añadido correctamente`
    });
  } catch (error) {
    console.error('Error al dar sello:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
