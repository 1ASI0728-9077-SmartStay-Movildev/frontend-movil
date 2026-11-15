import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, getBaseUrl, setBaseUrl } from '../api/client';
import { Button, colors, ErrorText, errMsg, Field, OkText } from '../components/ui';
import { useSession } from '../state/session';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const { login, notice } = useSession();
  const [mode, setMode] = useState<Mode>('signin');
  const [server, setServer] = useState(getBaseUrl());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(notice);

  const submit = async () => {
    setError(null);
    setInfo(null);
    // Mismas reglas que valida el backend.
    if (!/^[a-zA-Z0-9_.@]{3,100}$/.test(username.trim()) || password.length < 6) {
      setError('Usuario (3–100 caracteres: letras, números, _ . @) y contraseña de al menos 6.');
      return;
    }
    if (mode === 'signup' && password !== repeat) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      setBaseUrl(server);
      if (mode === 'signup') await api.signUp(username.trim(), password);
      login(await api.signIn(username.trim(), password));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const signup = mode === 'signup';
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Smart Stay</Text>
        <Text style={s.subtitle}>{signup ? 'Crea tu cuenta de huésped' : 'Inicia sesión para reservar'}</Text>

        <View style={s.gap}>
          <Field
            label="Servidor"
            value={server}
            onChangeText={setServer}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://mi-tunel.ejemplo.com"
          />
          <Field label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
          {signup && <Field label="Repite la contraseña" value={repeat} onChangeText={setRepeat} secureTextEntry />}
        </View>

        <OkText message={info} />
        <ErrorText message={error} />
        <Button
          title={signup ? 'Crear cuenta' : 'Ingresar'}
          onPress={submit}
          loading={loading}
          disabled={!username || !password || !server || (signup && !repeat)}
        />
        <Pressable
          onPress={() => {
            setMode(signup ? 'signin' : 'signup');
            setError(null);
          }}
          style={{ paddingVertical: 16 }}
        >
          <Text style={s.link}>{signup ? 'Ya tengo cuenta: iniciar sesión' : '¿No tienes cuenta? Regístrate'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingTop: 64 },
  title: { fontSize: 32, fontWeight: '800', color: colors.primary },
  subtitle: { color: colors.muted, marginBottom: 20, fontSize: 16 },
  gap: { gap: 10, marginBottom: 12 },
  link: { color: colors.primary, fontWeight: '600', textAlign: 'center' },
});
