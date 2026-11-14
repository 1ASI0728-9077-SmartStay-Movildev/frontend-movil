import { requireOptionalNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';
export type NearbyEvent = { type: string; id: string; value: string };
type Transport = {
  start(receiving: boolean): Promise<void>;
  connect(id: string): Promise<void>;
  confirm(id: string, agree: boolean): Promise<void>;
  send(id: string, message: string): Promise<void>;
  stop(): Promise<void>;
  addListener(
    name: 'onNearby',
    listener: (event: NearbyEvent) => void,
  ): { remove(): void };
};
export const nearby = requireOptionalNativeModule<Transport>('SmartStayNearby');
export async function permissions() {
  if (Platform.OS !== 'android' || !nearby)
    throw Error(
      'Requiere la compilación nativa Android; Expo Go no admite Nearby.',
    );
  const names =
    Platform.Version >= 31
      ? ['BLUETOOTH_SCAN', 'BLUETOOTH_ADVERTISE', 'BLUETOOTH_CONNECT']
      : [];
  if (Platform.Version >= 33) names.push('NEARBY_WIFI_DEVICES');
  else names.push('ACCESS_FINE_LOCATION');
  const result = await PermissionsAndroid.requestMultiple(
    names.map(
      (n) =>
        `android.permission.${n}` as Parameters<
          typeof PermissionsAndroid.request
        >[0],
    ),
  );
  if (
    Object.values(result).some((v) => v !== PermissionsAndroid.RESULTS.GRANTED)
  )
    throw Error('Permisos denegados. Habilítalos en Ajustes para reintentar.');
}
