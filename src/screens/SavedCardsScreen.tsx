import React, { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Button } from '../components/ui';
import { Card, listCards } from '../offline/cards';
import { api } from '../api/client';
import type { Room } from '../api/types';
export default function SavedCardsScreen({
  online,
  onShare,
  onCurrent,
}: {
  online: boolean;
  onShare: (c: Card) => void;
  onCurrent: (r: Room) => void;
}) {
  const [live, setLive] = useState<Room | null>(null);
  const [cards, setCards] = useState<Card[]>([]),
    [selected, setSelected] = useState<Card | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    listCards()
      .then(setCards)
      .catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLive(null);
    setError('');
    if (online && selected)
      api
        .searchRooms({})
        .then((rooms) => {
          if (!cancelled) {
            const r = rooms.find(
              (r) =>
                r.roomId === selected.room.roomId &&
                r.hotelId === selected.room.hotelId,
            );
            setLive(r ?? null);
            if (!r) setError('No aparece en el catálogo vigente.');
          }
        })
        .catch((e) => {
          if (!cancelled) setError(String(e));
        });
    return () => {
      cancelled = true;
    };
  }, [online, selected]);
  async function refresh(c: Card) {
    try {
      const rooms = await api.searchRooms({});
      const r = rooms.find(
        (r) => r.roomId === c.room.roomId && r.hotelId === c.room.hotelId,
      );
      if (!r) throw Error('La habitación ya no aparece en el catálogo.');
      onCurrent(r);
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text>Fichas guardadas · públicas</Text>
      <Text>{error}</Text>
      {!selected && cards.length === 0 && (
        <Text>Aún no hay fichas guardadas.</Text>
      )}
      {!selected ? (
        cards.map((c) => (
          <Button
            key={`${c.room.hotelId}:${c.room.roomId}`}
            title={`${c.room.hotelName} · ${c.room.roomTypeName}`}
            onPress={() => setSelected(c)}
          />
        ))
      ) : (
        <>
          <Button
            title="Volver a las fichas"
            onPress={() => setSelected(null)}
          />
          <Text>
            {selected.room.hotelName} · {selected.room.roomTypeName}
          </Text>
          <Text>
            {selected.room.city}, {selected.room.district} · Capacidad{' '}
            {selected.room.capacity} · {selected.room.areaM2 ?? '—'} m²
          </Text>
          <Text>{selected.room.amenities.join(', ')}</Text>
          <Text>
            Copia local obtenida:{' '}
            {new Date(selected.obtainedAt).toLocaleString()}
          </Text>
          <Text>
            Precio de referencia: {selected.room.currency}{' '}
            {selected.room.nightlyPrice}. Precio y disponibilidad vigentes
            requieren consultar la API. Las reservas se confirman en el
            servidor.
          </Text>
          {live && (
            <Text>
              Catálogo consultado ahora: {live.currency} {live.nightlyPrice} /
              noche. La disponibilidad por fechas se valida al reservar en el
              servidor.
            </Text>
          )}
          <Button title="Compartir cerca" onPress={() => onShare(selected)} />
          <Button
            title="Consultar datos vigentes"
            disabled={!online}
            onPress={() => void refresh(selected)}
          />
        </>
      )}
    </ScrollView>
  );
}
