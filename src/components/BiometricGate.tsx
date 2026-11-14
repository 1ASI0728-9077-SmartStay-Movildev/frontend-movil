import React, { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Button } from './ui';
import { useSession } from '../state/session';
/** Mounted per account/session. Neither token nor unlock state is persisted. */
export default function BiometricGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useSession();
  const [enabled, setEnabled] = useState(false),
    [locked, setLocked] = useState(false),
    [message, setMessage] = useState(''),
    [available, setAvailable] = useState(false);
  const prompting = useRef(false),
    alive = useRef(true),
    enabledRef = useRef(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    void Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.getEnrolledLevelAsync(),
    ])
      .then(([h, e]) => {
        if (alive.current)
          setAvailable(
            h && e === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG,
          );
      })
      .catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && enabledRef.current && !prompting.current)
        setLocked(true);
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, []);
  async function authenticate(activate = false) {
    if (prompting.current) return;
    prompting.current = true;
    setBusy(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: activate
          ? 'Activar desbloqueo de SmartStay'
          : 'Desbloquear SmartStay',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: true,
        biometricsSecurityLevel: 'strong',
      });
      if (!alive.current) return;
      if (result.success) {
        if (activate) {
          enabledRef.current = true;
          setEnabled(true);
        }
        setLocked(false);
        setMessage('');
      } else {
        setMessage('Autenticación cancelada o fallida.');
        if (!activate) setLocked(true);
      }
    } catch {
      if (alive.current) {
        setMessage('Biometría no disponible. Usa el login habitual.');
        if (!activate) setLocked(true);
      }
    } finally {
      prompting.current = false;
      if (alive.current) {
        setBusy(false);
        if (enabledRef.current && AppState.currentState !== 'active')
          setLocked(true);
      }
    }
  }
  if (locked)
    return (
      <View style={{ flex: 1, padding: 24, gap: 12 }}>
        <Text>SmartStay bloqueado</Text>
        <Text>{message}</Text>
        <Button
          title="Desbloquear con biometría"
          disabled={busy}
          onPress={() => void authenticate()}
        />
        <Button title="Volver al login habitual" onPress={logout} />
      </View>
    );
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 8 }}>
        <Text>{message}</Text>
        <Text>
          SmartStay no recopila, guarda ni transmite huellas. La biometría no
          renueva la sesión del servidor.
        </Text>
        {available ? (
          <Button
            disabled={busy}
            title={
              enabled
                ? 'Desactivar biometría'
                : 'Activar biometría para esta sesión'
            }
            onPress={() => {
              if (enabled) {
                enabledRef.current = false;
                setEnabled(false);
              } else void authenticate(true);
            }}
          />
        ) : (
          <Text>
            Biometría no disponible o sin configurar. Continúa con el login
            habitual.
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}
