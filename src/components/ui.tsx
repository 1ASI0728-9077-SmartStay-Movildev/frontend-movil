import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  primary: '#1f5eff',
  bg: '#f5f7fb',
  card: '#ffffff',
  text: '#16202e',
  muted: '#6b7685',
  danger: '#d33b3b',
  ok: '#1f9d55',
  warn: '#d98a00',
};

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={[
        s.btn,
        variant === 'outline' && s.btnOutline,
        variant === 'danger' && { backgroundColor: colors.danger },
        off && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[s.btnText, variant === 'outline' && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={s.error}>{message}</Text>;
}

export function OfflineScreen() {
  return (
    <View style={s.center}>
      <Text style={s.offTitle}>Sin conexión</Text>
      <Text style={s.offText}>
        Smart Stay necesita internet para funcionar. Conéctate a una red y la app se reanudará sola.
      </Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: colors.danger, marginVertical: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  offTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  offText: { fontSize: 16, color: colors.muted, textAlign: 'center' },
});
