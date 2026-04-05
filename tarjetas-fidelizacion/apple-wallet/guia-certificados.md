# Guía: Certificados para Apple Wallet

## Pasos

1. **Apple Developer Account** → https://developer.apple.com ($99/año)

2. **Crear Pass Type ID**
   - Ir a Certificates, Identifiers & Profiles
   - Identifiers → Pass Type IDs → `+`
   - Ejemplo: `pass.com.atomxdesign.fidelizacion`

3. **Generar certificado**
   - Selecciona tu Pass Type ID → Edit → Create Certificate
   - Sube un CSR (generado con Keychain o openssl)
   - Descarga el `.cer` y conviértelo a `.p12`

4. **Certificado WWDR de Apple** (intermediario)
   - Descárgalo desde: https://www.apple.com/certificateauthority/
   - Archivo: `AppleWWDRCA.cer`

5. **Firmar el pase con passkit-generator**
   ```js
   const { PKPass } = require('passkit-generator');
   const pass = await PKPass.from(
     { model: './pass-model/', certificates: { wwdr, signerCert, signerKey } },
     { serialNumber: 'CLIENTE-123', 'sellos': 3 }
   );
   const stream = pass.getAsStream(); // .pkpass listo para enviar
   ```
