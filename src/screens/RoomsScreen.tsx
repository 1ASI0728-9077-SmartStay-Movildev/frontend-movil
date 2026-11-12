import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api/client';
import type { Room } from '../api/types';
import { Button, colors, ErrorText, Loading } from '../components/ui';

export default function RoomsScreen({ onSelect }: { onSelect: (r: Room) => void }) {
  const [district, setDistrict] = useState('');
  const [guests, setGuests] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchRooms({
        district: district.trim() || undefined,
        guests: Number(guests) || undefined,
        maxPrice: Number(maxPrice) || undefined,
      });
      setRooms(data);
    } catch (e) {
      setRooms(null);
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [district, guests, maxPrice]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.filters}>
        <TextInput style={[s.input, { flex: 2 }]} placeholder="Distrito" value={district} onChangeText={setDistrict} />
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Huésp." value={guests} onChangeText={setGuests} keyboardType="number-pad" />
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Máx." value={maxPrice} onChangeText={setMaxPrice} keyboardType="number-pad" />
      </View>
      <View style={{ paddingHorizontal: 12 }}>
        <Button title="Buscar" onPress={load} loading={loading && !rooms} />
        <ErrorText message={error} />
      </View>
      {loading && !rooms ? (
        <Loading />
      ) : (
        <FlatList
          data={rooms ?? []}
          keyExtractor={(r) => String(r.roomId)}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={!error ? <Text style={s.empty}>No hay habitaciones con esos filtros.</Text> : undefined}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => onSelect(item)}>
              <Text style={s.hotel}>{item.hotelName}</Text>
              <Text style={s.muted}>
                {item.roomTypeName} · {item.district}, {item.city}
              </Text>
              <Text style={s.muted}>Capacidad: {item.capacity}</Text>
              <Text style={s.price}>
                {item.currency} {item.nightlyPrice.toFixed(2)} <Text style={s.muted}>/ noche</Text>
              </Text>
              {!item.isBookable && <Text style={{ color: colors.warn }}>No reservable</Text>}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, padding: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dee7', borderRadius: 10, padding: 10 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  hotel: { fontSize: 18, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted },
  price: { marginTop: 6, fontSize: 17, fontWeight: '700', color: colors.primary },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
