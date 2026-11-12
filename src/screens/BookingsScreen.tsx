import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import type { Booking } from '../api/types';
import { Button, colors, ErrorText, Loading } from '../components/ui';

const statusLabel: Record<string, string> = {
  PendingPayment: 'Pendiente de pago',
  Confirmed: 'Confirmada',
  Cancelled: 'Cancelada',
  Expired: 'Expirada',
};
const statusColor: Record<string, string> = {
  PendingPayment: colors.warn,
  Confirmed: colors.ok,
  Cancelled: colors.muted,
  Expired: colors.muted,
};

export default function BookingsScreen() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.myBookings());
    } catch (e) {
      setItems(null);
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = (b: Booking) => {
    Alert.alert('Cancelar reserva', `¿Cancelar la reserva #${b.id}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setBusyId(b.id);
          setError(null);
          try {
            await api.cancelBooking(b.id);
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Error inesperado');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading && !items) return <Loading />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 12 }}>
        <ErrorText message={error} />
      </View>
      <FlatList
        data={items ?? []}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!error ? <Text style={s.empty}>Aún no tienes reservas.</Text> : undefined}
        renderItem={({ item }) => {
          const active = item.status === 'PendingPayment' || item.status === 'Confirmed';
          return (
            <View style={s.card}>
              <Text style={s.title}>Reserva #{item.id}</Text>
              <Text style={s.muted}>
                {item.checkInDate.slice(0, 10)} → {item.checkOutDate.slice(0, 10)}
              </Text>
              <Text style={s.muted}>{item.guestName}</Text>
              <Text style={s.total}>
                {item.currency} {item.totalAmount.toFixed(2)}
              </Text>
              <Text style={{ color: statusColor[item.status] ?? colors.muted, fontWeight: '700', marginBottom: 6 }}>
                {statusLabel[item.status] ?? item.status}
              </Text>
              {active && <Button title="Cancelar" variant="danger" onPress={() => cancel(item)} loading={busyId === item.id} />}
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted },
  total: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
