import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { api, getBaseUrl, setBaseUrl } from '../api/client';
import { Button, colors, ErrorText } from '../components/ui';
import { useSession } from '../state/session';

export default function LoginScreen() {
  const { login } = useSession();
  const [server, setServer] = useState(getBaseUrl());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!/^[a-zA-Z0-9_.@]{3,100}$/.test(username.trim()) || password.length < 6) {
      setError('Usuario (3–100 caracteres: letras, números, _ . @) y contraseña de al menos 6.');
      return;
    }
    setLoading(true);
    try {
      setBaseUrl(server);
      const user = await api.signIn(username.trim(), password);
      login(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Smart Stay</Text>
        <Text style={s.subtitle}>Inicia sesión para reservar</Text>

        <Text style={s.label}>Servidor</Text>
        <TextInput
          style={s.input}
          value={server}
          onChangeText={setServer}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://mi-tunel.ejemplo.com"
        />
        <Text style={s.label}>Usuario</Text>
        <TextInput style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
        <Text style={s.label}>Contraseña</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

        <ErrorText message={error} />
        <Button title="Ingresar" onPress={submit} loading={loading} disabled={!username || !password || !server} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, paddingTop: 80 },
  title: { fontSize: 32, fontWeight: '800', color: colors.primary },
  subtitle: { color: colors.muted, marginBottom: 24, fontSize: 16 },
  label: { fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
});
