## Smart Stay – App móvil (Expo / React Native)

App móvil de Smart Stay para huéspedes y administradores. Usa todas las funciones que expone el
backend a través del gateway. No guarda nada en el dispositivo: el token y la URL del servidor
viven solo en memoria, y sin internet muestra "Sin conexión".

## Funciones

**Huésped**
- Registro e inicio de sesión.
- Búsqueda de habitaciones por distrito, huéspedes, precio mínimo y máximo, área mínima y tipo de cama.
- Ficha de la habitación con vista 3D y recorrido 360°.
- Reserva, pago simulado con tarjeta, comprobante de pago y cancelación.
- Asistente Concierge (IA): recomienda habitaciones disponibles para unas fechas y un presupuesto.
- Cuenta: perfil personal y cambio de contraseña.

**Administrador (`admin` y `chain_admin`)** – pestaña *Gestión*
- Hoteles: crear, editar y eliminar.
- Habitaciones: crear, editar, eliminar, ver sus reservas y diseñar el layout que genera la vista 3D.
- Catálogo: tipos de habitación; categorías y servicios (solo `chain_admin` puede crearlos).
- Usuarios: crear, editar, asignar rol, desactivar y reactivar.
- Perfiles registrados y reporte mensual (ingresos, reservas, cancelaciones, ocupación).
- Reservas: ver todas las de su ámbito, filtrar por habitación, confirmar y cancelar.

Un `admin` solo gestiona su hotel; el servidor rechaza cambios en otros.

## Ejecutar

```cmd
npm install
npx expo start
```

- **Emulador Android**: la URL por defecto `http://10.0.2.2:8080` apunta al gateway de tu PC.
- **Celular con Expo Go (misma WiFi)**: en la pantalla de acceso escribe `http://IP_DE_TU_PC:8080`.
- **Con túnel**: escribe la URL https del túnel en el campo "Servidor".
- URL inicial configurable: variable `EXPO_PUBLIC_API_URL`.

## Usuarios de prueba (seed del backend)

| Usuario | Contraseña | Rol |
|---|---|---|
| `guest1`, `guest2` | `Password123!` | Huésped |
| `admin` | `Password123!` | Administrador del Hotel Bolívar (ID 1) |
| `admin_cusco` | `Password123!` | Administrador de Cusco Andean Lodge (ID 2) |
| `chain_admin` | `Password123!` | Administrador de toda la cadena |

## Notas
- Una reserva queda en `PendingPayment` y vence a los 15 minutos si no se paga.
- El pago es simulado: usa una tarjeta de prueba como `4242 4242 4242 4242`. Un número terminado en `0000` se rechaza.
- Tras un pago aprobado, la reserva pasa a `Confirmed` unos segundos después.
- Cambiar la contraseña cierra la sesión.
- El perfil se crea una sola vez: el backend aún no tiene un endpoint para editarlo.
- Estadía: 1–30 noches. Fechas en formato `AAAA-MM-DD`.
- Los visores 3D y 360° cargan three.js desde internet.
- HTTP plano está permitido (`expo-build-properties`) para pruebas; en producción usa HTTPS.

## Estructura
```text
App.tsx                 # Pestañas según el rol
src/api/                # Cliente HTTP (client.ts) y tipos del backend (types.ts)
src/components/         # UI compartida y visores 3D / 360°
src/screens/            # Pantallas de huésped
src/screens/admin/      # Panel de administración
src/state/              # Sesión (session.tsx) y utilidades de carga (hooks.ts)
src/viewer/             # HTML de los visores three.js que corren en la WebView
```

## APK
```cmd
npm i -g eas-cli
eas build -p android --profile preview
```
