import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api/client';
import type { Booking, Room } from '../api/types';
import { Button, colors, ErrorText } from '../components/ui';
import { useSession } from '../state/session';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(s: string): Date | null {
  if (!DATE_RE.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

export default function RoomDetailScreen({
  room,
  onBack,
  onBooked,
}: {
  room: Room;
  onBack: () => void;
  onBooked: () => void;
}) {
  const { user } = useSession();
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Booking | null>(null);

  const inD = parseDate(checkIn);
  const outD = parseDate(checkOut);
  const nights = inD && outD ? Math.round((outD.getTime() - inD.getTime()) / 86400000) : 0;
  const validNights = nights >= 1 && nights <= 30;
  const canSubmit = guestName.trim() && /\S+@\S+\.\S+/.test(guestEmail) && validNights && room.isBookable;

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const b = await api.createBooking({
        roomId: room.roomId,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        checkInDate: checkIn,
        checkOutDate: checkOut,
      });
      setDone(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>¡Reserva creada!</Text>
        <Text style={s.line}>Código: #{done.id}</Text>
        <Text style={s.line}>
          {done.checkInDate.slice(0, 10)} → {done.checkOutDate.slice(0, 10)}
        </Text>
        <Text style={s.line}>
          Total: {done.currency} {done.totalAmount.toFixed(2)}
        </Text>
        <Text style={s.line}>Estado: {done.status}</Text>
        <Text style={s.note}>El pago aún no está disponible en la app; la reserva queda pendiente.</Text>
        <Button title="Ver mis reservas" onPress={onBooked} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Button title="← Volver" variant="outline" onPress={onBack} />
      <Text style={s.title}>{room.hotelName}</Text>
      <Text style={s.muted}>
        {room.roomTypeName} · {room.district}, {room.city}
      </Text>
      <Text style={s.muted}>
        Capacidad: {room.capacity}
        {room.areaM2 ? ` · ${room.areaM2} m²` : ''}
        {room.bedSummary ? ` · ${room.bedSummary}` : ''}
      </Text>
      <Text style={s.price}>
        {room.currency} {room.nightlyPrice.toFixed(2)} / noche
      </Text>
      {room.amenities.length > 0 && <Text style={s.muted}>Servicios: {room.amenities.join(', ')}</Text>}

      <View style={{ height: 16 }} />
      <Text style={s.section}>Reservar</Text>
      <TextInput style={s.input} placeholder="Nombre del huésped" value={guestName} onChangeText={setGuestName} />
      <TextInput
        style={s.input}
        placeholder="Correo"
        value={guestEmail}
        onChangeText={setGuestEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput style={s.input} placeholder="Entrada (AAAA-MM-DD)" value={checkIn} onChangeText={setCheckIn} keyboardType="numbers-and-punctuation" />
      <TextInput style={s.input} placeholder="Salida (AAAA-MM-DD)" value={checkOut} onChangeText={setCheckOut} keyboardType="numbers-and-punctuation" />

      {validNights ? (
        <Text style={s.line}>
          {nights} noche(s) · Total estimado: {room.currency} {(nights * room.nightlyPrice).toFixed(2)}
        </Text>
      ) : checkIn && checkOut ? (
        <Text style={s.muted}>La estadía debe ser de 1 a 30 noches con fechas válidas.</Text>
      ) : null}
      {!user && <Text style={s.muted}>Debes iniciar sesión.</Text>}
      <ErrorText message={error} />
      <Button title="Reservar" onPress={submit} loading={loading} disabled={!canSubmit} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 8 },
  section: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted },
  line: { fontSize: 16, color: colors.text },
  note: { color: colors.warn, marginVertical: 8 },
  price: { fontSize: 18, fontWeight: '700', color: colors.primary },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dee7', borderRadius: 10, padding: 12, fontSize: 16 },
});
