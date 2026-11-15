import React, { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { ApiError, api } from '../api/client';
import type { Booking, Payment } from '../api/types';
import { Button, Card, Chips, colors, confirmAction, day, ErrorText, Field, Loading, money, st } from '../components/ui';
import { useAction, useLoad } from '../state/hooks';
import { useSession } from '../state/session';
import PaymentScreen, { PaymentReceipt } from './PaymentScreen';

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

type Scope = 'mine' | 'all';
const scopeLabels: Record<string, string> = { mine: 'Mis reservas', all: 'Todas (gestión)' };

// Huésped: sus reservas, con pago y cancelación.
// Administrador: además puede ver todas las de su ámbito, filtrar por habitación y confirmarlas.
export default function BookingsScreen() {
  const { isAdmin } = useSession();
  const [scope, setScope] = useState<Scope>(isAdmin ? 'all' : 'mine');
  const [roomFilter, setRoomFilter] = useState('');
  const [paying, setPaying] = useState<Booking | null>(null);
  const [receipts, setReceipts] = useState<Record<number, Payment | 'none'>>({});
  const roomId = Number(roomFilter) || 0;

  const { data, loading, error, reload } = useLoad<Booking[]>(() =>
    scope === 'mine' ? api.myBookings() : roomId ? api.bookingsByRoom(roomId) : api.allBookings(),
  );
  const act = useAction();

  const changeScope = (v: string) => {
    setScope(v as Scope);
    setTimeout(reload, 0);
  };

  const cancel = (b: Booking) =>
    confirmAction('Cancelar reserva', `¿Cancelar la reserva #${b.id}?`, 'Sí, cancelar', async () => {
      if (await act.run(`c${b.id}`, () => api.cancelBooking(b.id))) reload();
    });

  const confirm = (b: Booking) =>
    confirmAction('Confirmar reserva', `¿Confirmar la reserva #${b.id} sin pago en la app?`, 'Confirmar', async () => {
      if (await act.run(`k${b.id}`, () => api.confirmBooking(b.id))) reload();
    });

  const showPayment = (b: Booking) =>
    act.run(`p${b.id}`, async () => {
      try {
        const p = await api.paymentByBooking(b.id);
        setReceipts((r) => ({ ...r, [b.id]: p }));
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) setReceipts((r) => ({ ...r, [b.id]: 'none' }));
        else throw e;
      }
    });

  if (paying) {
    return (
      <PaymentScreen
        booking={paying}
        onBack={() => setPaying(null)}
        onDone={() => {
          setPaying(null);
          reload();
        }}
      />
    );
  }

  if (loading && !data) return <Loading />;

  return (
    <View style={st.flex}>
      <View style={{ paddingHorizontal: 12, paddingTop: 12, gap: 8 }}>
        {isAdmin && <Chips options={['all', 'mine']} labels={scopeLabels} value={scope} onChange={changeScope} />}
        {isAdmin && scope === 'all' && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={st.flex}>
              <Field placeholder="Filtrar por n.º de habitación" value={roomFilter} onChangeText={setRoomFilter} keyboardType="number-pad" />
            </View>
            <Button title="Filtrar" small onPress={reload} />
          </View>
        )}
        <ErrorText message={error ?? act.error} />
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListEmptyComponent={!error ? <Text style={st.empty}>No hay reservas.</Text> : undefined}
        renderItem={({ item }) => {
          const pending = item.status === 'PendingPayment';
          const active = pending || item.status === 'Confirmed';
          const receipt = receipts[item.id];
          return (
            <Card>
              <Text style={st.cardTitle}>
                Reserva #{item.id} · Habitación {item.roomId}
              </Text>
              <Text style={st.muted}>
                {day(item.checkInDate)} → {day(item.checkOutDate)}
              </Text>
              <Text style={st.muted}>
                {item.guestName} · {item.guestEmail}
              </Text>
              <Text style={st.price}>{money(item.totalAmount, item.currency)}</Text>
              <Text style={{ color: statusColor[item.status] ?? colors.muted, fontWeight: '700' }}>
                {statusLabel[item.status] ?? item.status}
              </Text>
              {pending && <Text style={st.muted}>Vence a los 15 minutos de creada si no se paga.</Text>}
              <View style={[st.row, { marginTop: 6 }]}>
                {pending && <Button title="Pagar" small onPress={() => setPaying(item)} />}
                {pending && isAdmin && scope === 'all' && (
                  <Button title="Confirmar" small variant="outline" onPress={() => confirm(item)} loading={act.busy === `k${item.id}`} />
                )}
                {!pending && (
                  <Button title="Ver pago" small variant="outline" onPress={() => showPayment(item)} loading={act.busy === `p${item.id}`} />
                )}
                {active && (
                  <Button title="Cancelar" small variant="danger" onPress={() => cancel(item)} loading={act.busy === `c${item.id}`} />
                )}
              </View>
              {receipt === 'none' && <Text style={st.muted}>Esta reserva no tiene un pago registrado.</Text>}
              {receipt && receipt !== 'none' && <PaymentReceipt payment={receipt} />}
            </Card>
          );
        }}
      />
    </View>
  );
}
