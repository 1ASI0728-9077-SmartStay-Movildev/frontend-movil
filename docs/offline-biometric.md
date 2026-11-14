# Fichas públicas offline y biometría local

## Revisión y rama

Clon oficial `frontend-movil`, limpio al comenzar. No se encontraron AGENTS.md ni instrucciones sobre una base móvil distinta. Base: `origin/master`, HEAD `81a946c72cde8ca4d548e27916dfa112b74ec778`; rama local: `feature/mobile-offline-biometric`. No hubo cambios ajenos que requirieran worktree. La primera entrega quedó local, sin commits ni push. Posteriormente el usuario autorizó crear el commit y subir exclusivamente `feature/mobile-offline-biometric`. No se autorizó merge, PR ni publicación de builds. El backend se consultó en un clon separado solo como referencia; no se modificó. El frontend web no se tocó.

Se conserva Expo SDK 58, React Native, TypeScript y `pe.smartstay.mobile`. El módulo Kotlin es local y autovinculado desde `modules/`; el manifiesto y Gradle del módulo son fuentes versionadas. El directorio raíz `android/` sigue siendo generado por prebuild.

## Comportamiento

- Inicio, Fichas guardadas y Recibir ficha quedan accesibles al arrancar sin sesión. Login, catálogo y reservas requieren conexión. Durante una sesión con biometría activada el contenido queda detrás del bloqueo; volver al login elimina la sesión y permite consultar las fichas públicas.
- Guardar ficha persiste exclusivamente el subconjunto público de Room en expo-sqlite. Clave única: hotelId + roomId. Una copia antigua no reemplaza una más reciente. La fecha indica cuándo se obtuvo la copia, no una fecha de actualización del servidor (Room no la ofrece).
- La vista local muestra capacidad, área, servicios, precio histórico y fecha. Al abrir una ficha con internet o recuperar conexión en esa vista se consulta `/api/v1/rooms/search` para mostrar el precio de catálogo actual. Consultar datos vigentes abre el detalle actual después de iniciar sesión. No se usa la ficha local para crear reservas ni se persiste isBookable como promesa de disponibilidad.
- Compartir cerca descubre y Recibir ficha anuncia con `P2P_POINT_TO_POINT`, servicio `pe.smartstay.roomshare.v1`. Ambos deben aceptar explícitamente los dígitos de Nearby antes de que se envíe una ficha. El flujo se detiene al cerrar, pasar al fondo, fallar o agotar 60 segundos; ofrece reintento.
- JSON UTF-8 máximo 4096 bytes: version=1, type=room-card, messageId, obtainedAt ISO UTC canónico y room con campos públicos permitidos. Se validan ambos extremos y se rechazan campos extra. No contiene sesión, huéspedes ni reservas. El ACK versionado se correlaciona con messageId y sale solo después de que SQLite haya guardado la ficha; un duplicado hace upsert y obtiene ACK otra vez. El receptor mantiene la conexión para ese reintento hasta salir o agotar el tiempo. Un ACK perdido puede dejar al emisor sin confirmación aun cuando la ficha quedó guardada; reintentar es seguro.
- La adaptación de `client-templates/android-nearby` no copia sus ACK prematuros ni sus ejemplos de endpoints internos. El formato anidado con capacidad/servicios no es compatible con un cliente que solo use el JSON plano de esa plantilla; ambos teléfonos deben instalar esta versión.
- La biometría es opcional y se verifica al activarla; requiere biometría fuerte configurada. Usa expo-local-authentication (AndroidX BiometricPrompt en Android). AppState oculta toda la parte autenticada, incluyendo Mis reservas, al pasar al fondo; evita relanzar el diálogo por sus propios eventos. Cancelar/fallar mantiene bloqueado. Se ofrece salir al login. No se persistieron tokens ni reservas privadas, por lo que no se necesita cifrado ni CryptoObject para este alcance. Token, preferencia biométrica y desbloqueo viven solo en la sesión y se eliminan al salir, recibir 401 o terminar el proceso. Una nueva cuenta/sesión requiere activar nuevamente. SmartStay no guarda ni transmite huellas y la biometría no renueva tokens.

## Contratos existentes y límites

Se conservan los endpoints actuales de autenticación y reservas. La consulta pública disponible en el cliente es `GET /api/v1/rooms/search`; no se inventó un GET de detalle ni se llamó a `/internal/v1/availability/check`. El catálogo no garantiza disponibilidad por fechas: se valida mediante la creación de reserva existente (`POST /api/v1/bookings`). Mostrar disponibilidad confirmada antes de reservar requeriría que el backend exponga y documente un contrato público por habitación/fechas. No se implementa una reserva offline.

## Construcción local e instalación

Requiere Node compatible con Expo 58 (los tests usan node:sqlite, Node 24), JDK y Android SDK correspondientes a la versión de Expo. Instalar Android SDK/aceptar sus licencias y configurar ANDROID_HOME, además de adb para instalar.

```sh
npm ci
npm run typecheck
npm test
npx expo prebuild --platform android --no-install
npx expo-modules-autolinking resolve --platform android
cd android
./gradlew :app:assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

`assembleRelease` incluye JavaScript/Hermes y no requiere Metro durante la demo. La configuración generada de Expo usa firma de desarrollo para la variante release local: solo para pruebas, no publicar ese APK. La app necesita Google Play services para Nearby. Expo Go no carga este módulo; `npm run android` permite desarrollar una compilación nativa con Metro, pero no sirve para demostrar independencia de Metro.

## Verificación ejecutada

- `npm run typecheck`: correcto.
- `npm test`: esquema/UTF-8/privacidad, SQLite real reabierto desde Node (adaptador de pruebas para expo-sqlite), deduplicación y conservación de la copia más reciente; componente biométrico con hardware/AppState simulados (cancelar oculta contenido, autenticar no entra en bucle); rechazo del código sin envío y ACK posterior a persistencia, incluido fallo de escritura; API con 401/offline simulados.
- `npx expo prebuild --platform android --no-install`: correcto.
- Resolución de autolinking Android: detecta `pe.smartstay.nearby.SmartStayNearbyModule`.
- `npx expo export --platform android`: bundle Hermes generado correctamente.
- `git diff --check`: correcto.
- Se intentó `:app:assembleRelease`: no completó; la descarga inicial de Gradle falló con `java.net.ConnectException: Connection refused`. No hay Android SDK instalado. No se verificó compilación Kotlin ni se produjo un APK.

Los tests con dobles no sustituyen Android, su diálogo biométrico, expo-sqlite nativo ni la radio Nearby. No se ejecutó el backend ni se verificó login/catálogo/reservas extremo a extremo.

## Prueba física pendiente (dos Android)

1. Construir e instalar el mismo APK release local en A y B. Con backend accesible, iniciar sesión en A, verificar búsqueda y reservas existentes. Abrir una habitación y Guardar ficha. Activar biometría, pasar al fondo, volver y cancelar: no debe verse Mis reservas ni ningún contenido autenticado. Autenticar y comprobar recuperación. Salir e iniciar con otra cuenta: la opción debe estar desactivada. Forzar un 401 y verificar vuelta al login. Cerrar proceso: debe volver a pedir login.
2. Apagar datos móviles y quitar acceso a internet/backend de ambos teléfonos, dejando Wi-Fi y Bluetooth encendidos. Desconectar Metro. Forzar cierre/reabrir A y abrir Fichas guardadas sin login: debe verse la copia y su fecha, sin permitir reserva offline.
3. B: Recibir ficha → Iniciar. A: abrir ficha → Compartir cerca → Iniciar → seleccionar B. Denegar permisos primero y comprobar explicación y reintento desde Ajustes. Repetir con permisos concedidos (en Android antiguo comprobar ubicación habilitada).
4. Comparar código en ambos. Rechazar en uno: no debe enviarse/guardarse. Reintentar y aceptar en ambos: A solo muestra confirmación cuando B guarda. Repetir envío: B debe conservar una sola ficha.
5. Forzar cierre de B y reabrir aún offline/sin sesión: ficha legible. Cancelar durante búsqueda, alejar dispositivos y esperar timeout: radios de búsqueda/anuncio detenidos y opción de reintento. Pasar al fondo durante permisos/conexión tampoco debe iniciar/continuar una búsqueda oculta.
6. Restaurar internet/backend en B y abrir ficha: consulta catálogo actual. Iniciar sesión, consultar detalle vigente y crear/cancelar una reserva de prueba mediante el flujo existente del servidor. Verificar que no se hayan copiado datos privados al intercambio ni a SQLite.

Todo este protocolo físico queda pendiente: el entorno no dispone de dos Android ni de backend ejecutándose.
