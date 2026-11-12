# Smart Stay – App móvil (Expo / React Native)

App de huésped: login, búsqueda de habitaciones, reserva y "Mis reservas" (con cancelación).
Todo viene del backend; sin internet muestra "Sin conexión". No guarda nada en el dispositivo
(el token y la URL del servidor viven solo en memoria). **Sin pagos, Concierge ni tour 360° por ahora.**

## Ejecutar

```cmd
npm install
npx expo install --fix
npx expo start
```

- **Emulador Android**: la URL por defecto `http://10.0.2.2:8080` apunta al gateway de tu PC.
- **Celular con Expo Go (misma WiFi)**: en la pantalla de login escribe `http://IP_DE_TU_PC:8080`.
- **Con túnel**: escribe la URL https del túnel en el campo "Servidor".
- URL inicial configurable: variable `EXPO_PUBLIC_API_URL` (ej. `set EXPO_PUBLIC_API_URL=https://xxx.ngrok-free.app`).

## Usuarios de prueba
Los del `seed` del backend (ej. `guest1`).

## Notas
- Reservas quedan en `PendingPayment` (sin módulo de pago); expiran o las confirma un admin.
- Estadía: 1–30 noches. Fechas en formato `AAAA-MM-DD`.
- HTTP plano está permitido (`expo-build-properties`) para pruebas; en producción usa HTTPS.

## APK
```cmd
npm i -g eas-cli
eas build -p android --profile preview
```
