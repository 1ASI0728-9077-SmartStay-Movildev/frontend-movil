import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../../api/client';
import type { AdminRoom, Booking } from '../../api/types';
import { Button, Card, Chips, confirmAction, day, ErrorText, Field, Header, Loading, money, MultiChips, num, st } from '../../components/ui';
import { useAction, useLoad } from '../../state/hooks';
import { useSession } from '../../state/session';
import RoomLayoutScreen from './RoomLayoutScreen';

type Form = {
  id: number | null;
  hotelId: number | null;
  roomTypeId: number | null;
  price: string;
  description: string;
  amenities: string[];
};

export default function RoomsAdmin({ onBack }: { onBack: () => void }) {
  const { user, isChainAdmin } = useSession();
  const { data, loading, error, reload } = useLoad(async () => {
    const [rooms, hotels, types, amenities] = await Promise.all([api.rooms(), api.hotels(), api.roomTypes(), api.amenities()]);
    return { rooms, hotels, types, amenities };
  });
  const act = useAction();
  const [form, setForm] = useState<Form | null>(null);
  const [layoutRoom, setLayoutRoom] = useState<AdminRoom | null>(null);
  const [bookings, setBookings] = useState<{ room: AdminRoom; items: Booking[] } | null>(null);
  const [hotelFilter, setHotelFilter] = useState<string | null>(null);
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const canManage = (hotelId: number) => isChainAdmin || user?.hotelId === hotelId;
  const hotelName = (id: number) => data?.hotels.find((h) => h.id === id)?.name ?? `Hotel #${id}`;
  const myHotels = (data?.hotels ?? []).filter((h) => canManage(h.id));

  const remove = (r: AdminRoom) =>
    confirmAction('Eliminar habitación', `¿Eliminar la habitación #${r.id}? Esta acción no se puede deshacer.`, 'Eliminar', async () => {
      if (await act.run(`d${r.id}`, () => api.deleteRoom(r.id))) reload();
    });

  const showBookings = (r: AdminRoom) =>
    act.run(`b${r.id}`, async () => setBookings({ room: r, items: await api.bookingsByRoom(r.id) }));

  if (layoutRoom) return <RoomLayoutScreen roomId={layoutRoom.id} onBack={() => setLayoutRoom(null)} />;

  if (bookings) {
    return (
      <ScrollView contentContainerStyle={st.screen}>
        <Header title={`Reservas de la habitación #${bookings.room.id}`} onBack={() => setBookings(null)} />
        {bookings.items.length === 0 && <Text style={st.empty}>Esta habitación no tiene reservas.</Text>}
        {bookings.items.map((b) => (
          <Card key={b.id}>
            <Text style={st.cardTitle}>Reserva #{b.id}</Text>
            <Text style={st.muted}>
              {day(b.checkInDate)} → {day(b.checkOutDate)} · {b.guestName}
            </Text>
            <Text style={st.muted}>
              {money(b.totalAmount, b.currency)} · {b.status}
            </Text>
          </Card>
        ))}
        <Text style={[st.muted, { fontSize: 12 }]}>Para confirmar o cancelar usa la pestaña Reservas.</Text>
      </ScrollView>
    );
  }

  if (form) {
    const price = num(form.price);
    const valid = form.hotelId !== null && form.roomTypeId !== null && price !== undefined && price > 0 && form.description.trim() !== '';
    const save = async () => {
      if (form.hotelId === null || form.roomTypeId === null || price === undefined) return;
      const body = { roomTypeId: form.roomTypeId, price, description: form.description.trim(), amenities: form.amenities };
      const hotelId = form.hotelId;
      const ok = await act.run('save', () => (form.id === null ? api.createRoom({ ...body, hotelId }) : api.updateRoom(form.id, body)));
      if (ok) {
        setForm(null);
        reload();
      }
    };
    const typeLabels = Object.fromEntries((data?.types ?? []).map((t) => [String(t.id), t.name]));
    const hotelLabels = Object.fromEntries(myHotels.map((h) => [String(h.id), h.name]));
    return (
      <ScrollView contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
        <Header
          title={form.id === null ? 'Nueva habitación' : `Editar habitación #${form.id}`}
          onBack={() => {
            act.setError(null);
            setForm(null);
          }}
        />
        {form.id === null ? (
          <>
            <Text style={st.label}>Hotel</Text>
            <Chips
              options={Object.keys(hotelLabels)}
              labels={hotelLabels}
              value={form.hotelId === null ? null : String(form.hotelId)}
              onChange={(v) => set({ hotelId: Number(v) })}
            />
            {myHotels.length === 0 && <Text style={st.muted}>No tienes hoteles en tu ámbito.</Text>}
          </>
        ) : (
          <Text style={st.muted}>{hotelName(form.hotelId ?? 0)}</Text>
        )}
        <Text style={st.label}>Tipo de habitación</Text>
        <Chips
          options={Object.keys(typeLabels)}
          labels={typeLabels}
          value={form.roomTypeId === null ? null : String(form.roomTypeId)}
          onChange={(v) => set({ roomTypeId: Number(v) })}
        />
        <Field label="Precio por noche (USD)" value={form.price} onChangeText={(v) => set({ price: v })} keyboardType="decimal-pad" />
        <Field
          label="Descripción"
          value={form.description}
          onChangeText={(v) => set({ description: v })}
          multiline
          style={{ minHeight: 70, textAlignVertical: 'top' }}
        />
        <Text style={st.label}>Servicios</Text>
        <MultiChips
          options={Array.from(new Set([...(data?.amenities ?? []), ...form.amenities]))}
          values={form.amenities}
          onChange={(v) => set({ amenities: v })}
        />
        <ErrorText message={act.error} />
        <Button title="Guardar" onPress={save} loading={act.busy === 'save'} disabled={!valid} />
        {form.id === null && (
          <Text style={[st.muted, { fontSize: 12 }]}>Después de crearla, usa "Diseño 3D" para definir medidas y camas.</Text>
        )}
      </ScrollView>
    );
  }

  const filterLabels: Record<string, string> = Object.fromEntries((data?.hotels ?? []).map((h) => [String(h.id), h.name]));
  const rooms = (data?.rooms ?? []).filter((r) => hotelFilter === null || String(r.hotelId) === hotelFilter);

  return (
    <ScrollView contentContainerStyle={st.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <Header title="Habitaciones" onBack={onBack} />
      <Button
        title="Nueva habitación"
        onPress={() =>
          setForm({
            id: null,
            hotelId: myHotels.length === 1 ? myHotels[0].id : null,
            roomTypeId: null,
            price: '',
            description: '',
            amenities: [],
          })
        }
      />
      <Chips options={Object.keys(filterLabels)} labels={filterLabels} value={hotelFilter} onChange={(v) => setHotelFilter(v === hotelFilter ? null : v)} />
      <ErrorText message={error ?? act.error} />
      {loading && !data ? <Loading /> : null}
      {data && rooms.length === 0 && <Text style={st.empty}>No hay habitaciones.</Text>}
      {rooms.map((r) => (
        <Card key={r.id}>
          <Text style={st.cardTitle}>
            #{r.id} · {r.roomTypeName}
          </Text>
          <Text style={st.muted}>{hotelName(r.hotelId)}</Text>
          <Text style={st.price}>{money(r.price)} / noche</Text>
          {r.description ? <Text style={st.muted}>{r.description}</Text> : null}
          {r.amenities?.length > 0 && <Text style={st.muted}>Servicios: {r.amenities.join(', ')}</Text>}
          {canManage(r.hotelId) ? (
            <View style={[st.row, { marginTop: 6 }]}>
              <Button
                title="Editar"
                small
                variant="outline"
                onPress={() =>
                  setForm({
                    id: r.id,
                    hotelId: r.hotelId,
                    roomTypeId: r.roomTypeId,
                    price: String(r.price),
                    description: r.description ?? '',
                    amenities: r.amenities ?? [],
                  })
                }
              />
              <Button title="Diseño 3D" small variant="outline" onPress={() => setLayoutRoom(r)} />
              <Button title="Reservas" small variant="outline" onPress={() => showBookings(r)} loading={act.busy === `b${r.id}`} />
              <Button title="Eliminar" small variant="danger" onPress={() => remove(r)} loading={act.busy === `d${r.id}`} />
            </View>
          ) : (
            <Text style={[st.muted, { fontSize: 12 }]}>Fuera de tu ámbito: solo lectura.</Text>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}
