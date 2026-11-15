import React from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

export const colors = {
  primary: '#205b65',
  bg: '#f4f7fa',
  card: '#ffffff',
  text: '#19334b',
  muted: '#526775',
  border: '#d5e0e6',
  danger: '#8d2921',
  dangerBg: '#fff1ef',
  ok: '#1f7a55',
  warn: '#8a6d1a',
  soft: '#e3f0f1',
};

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  small,
}: {
  title: string;
  small?: boolean;
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
        small && s.btnSmall,
        variant === 'outline' && s.btnOutline,
        variant === 'danger' && { backgroundColor: colors.danger },
        off && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} />
      ) : (
        <Text style={[s.btnText, small && { fontSize: 14 }, variant === 'outline' && { color: colors.primary }]}>{title}</Text>
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

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Error inesperado');
export const money = (n: number, currency = 'USD') => `${currency} ${Number(n).toFixed(2)}`;
export const day = (iso: string) => String(iso).slice(0, 10);
export const num = (v: string): number | undefined => {
  const n = Number(v.trim().replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : undefined;
};

export function confirmAction(title: string, message: string, yes: string, onYes: () => void) {
  Alert.alert(title, message, [
    { text: 'No', style: 'cancel' },
    { text: yes, style: 'destructive', onPress: onYes },
  ]);
}

export function Field({ label, style, ...props }: { label?: string } & TextInputProps) {
  return (
    <View>
      {label ? <Text style={st.label}>{label}</Text> : null}
      <TextInput placeholderTextColor="#8a9aa6" {...props} style={[st.input, style]} />
    </View>
  );
}

export function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={s.head}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={s.back}>← Volver</Text>
        </Pressable>
      ) : null}
      <Text style={st.title}>{title}</Text>
    </View>
  );
}

export function Card({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable style={st.card} onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return <View style={st.card}>{children}</View>;
}

// Selección única. Si se pasa `labels`, se muestra ese texto en lugar del valor.
export function Chips({
  options,
  value,
  onChange,
  labels,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <View style={s.chips}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[s.chip, o === value && s.chipOn]}>
          <Text style={[s.chipText, o === value && { color: '#fff' }]}>{labels?.[o] ?? o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function MultiChips({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const on = values.includes(o);
        return (
          <Pressable
            key={o}
            onPress={() => onChange(on ? values.filter((x) => x !== o) : [...values, o])}
            style={[s.chip, on && s.chipOn]}
          >
            <Text style={[s.chipText, on && { color: '#fff' }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function OkText({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={s.okBox}>{message}</Text>;
}

// Estilos compartidos por las pantallas.
export const st = StyleSheet.create({
  screen: { padding: 16, gap: 10, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  section: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 8 },
  label: { fontWeight: '600', color: colors.text, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted },
  line: { fontSize: 16, color: colors.text },
  price: { fontSize: 17, fontWeight: '700', color: colors.primary },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  note: { color: colors.warn },
  flex: { flex: 1 },
});

const s = StyleSheet.create({
  head: { gap: 6, marginBottom: 4 },
  back: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.primary },
  okBox: {
    color: colors.ok,
    backgroundColor: '#eaf6f0',
    borderWidth: 1,
    borderColor: '#b9dccb',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12, minHeight: 34, borderRadius: 8 },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  error: { color: colors.danger, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: '#e3b5ad', borderRadius: 8, padding: 10, marginVertical: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  offTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 8 },
  offText: { fontSize: 16, color: colors.muted, textAlign: 'center' },
});
