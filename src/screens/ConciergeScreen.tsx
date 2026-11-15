import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../api/client';
import type { ConciergeOffer, ConciergeResponse, Room } from '../api/types';
import { Button, Card, ErrorText, errMsg, Field, Header, money, num, st } from '../components/ui';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (v: string) => DATE_RE.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());

export type StayDates = { checkIn: string; checkOut: string };

// Asistente Concierge: el backend busca habitaciones realmente disponibles y la IA
// (DeepSeek) elige y explica las mejores. Los precios siempre los calcula el servidor.
export default function ConciergeScreen({ onSelect }: { onSelect: (room: Room, dates: StayDates) => void }) {
  const [message, setMessage] = useState('');
  const [district, setDistrict] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<ConciergeResponse | null>(null);

  const nights =
    validDate(checkIn) && validDate(checkOut)
      ? Math.round((new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) / 86400000)
      : 0;
  const g = num(guests) ?? 0;
  const b = num(budget);
  const valid =
    message.trim().length > 0 &&
    message.length <= 500 &&
    district.trim().length > 0 &&
    nights >= 1 &&
    nights <= 30 &&
    g >= 1 &&
    g <= 10 &&
    b !== undefined &&
    b >= 0;

  const ask = async () => {
    setError(null);
    setAnswer(null);
    setLoading(true);
    try {
      setAnswer(
        await api.concierge({
          message: message.trim(),
          district: district.trim(),
          checkIn,
          checkOut,
          guests: g,
          budgetTotal: b ?? 0,
          currency: 'USD',
        }),
      );
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  // Abre la ficha de la habitación recomendada con las fechas ya elegidas.
  const open = async (o: ConciergeOffer) => {
    setOpening(o.roomId);
    let room: Room | undefined;
    try {
      room = (await api.searchRooms({ district: o.district })).find((r) => r.roomId === o.roomId);
    } catch {
      /* se usa la oferta tal cual */
    }
    setOpening(null);
    onSelect(
      room ?? {
        roomId: o.roomId,
        hotelId: o.hotelId,
        hotelName: o.hotelName,
        district: o.district,
        city: o.district,
        roomTypeName: o.roomTypeName,
        nightlyPrice: o.nightlyPrice,
        currency: o.currency,
        capacity: o.capacity,
        isBookable: true,
        tourPath: o.tourPath,
        amenities: o.amenities ?? [],
      },
      { checkIn, checkOut },
    );
  };

  return (
    <ScrollView contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
      <Header title="Asistente Concierge" />
      <Text style={st.muted}>Cuéntale qué buscas y te recomienda habitaciones disponibles para tus fechas.</Text>

      <Field
        label="¿Qué estás buscando?"
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={500}
        placeholder="Ej.: algo tranquilo, con buena vista y recorrido 360°"
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <Field label="Distrito o ciudad" value={district} onChangeText={setDistrict} placeholder="Ej.: Lima" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={st.flex}>
          <Field label="Entrada" value={checkIn} onChangeText={setCheckIn} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" />
        </View>
        <View style={st.flex}>
          <Field label="Salida" value={checkOut} onChangeText={setCheckOut} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={st.flex}>
          <Field label="Huéspedes (1–10)" value={guests} onChangeText={setGuests} keyboardType="number-pad" />
        </View>
        <View style={st.flex}>
          <Field label="Presupuesto total (USD)" value={budget} onChangeText={setBudget} keyboardType="number-pad" />
        </View>
      </View>
      {checkIn !== '' && checkOut !== '' && (nights < 1 || nights > 30) && (
        <Text style={st.muted}>La estadía debe ser de 1 a 30 noches con fechas válidas.</Text>
      )}

      <ErrorText message={error} />
      <Button title="Pedir recomendación" onPress={ask} loading={loading} disabled={!valid} />

      {answer && (
        <>
          <Card>
            <Text style={st.line}>{answer.assistantMessage}</Text>
            <Text style={[st.muted, { fontSize: 12, marginTop: 6 }]}>
              {answer.fallbackUsed ? 'Respuesta generada sin IA (modo de respaldo).' : 'Recomendación generada con IA.'}
            </Text>
          </Card>
          {answer.offers.map((o) => (
            <Card key={o.roomId}>
              <Text style={st.cardTitle}>{o.hotelName}</Text>
              <Text style={st.muted}>
                {o.roomTypeName} · {o.district} · Capacidad {o.capacity}
              </Text>
              <Text style={st.price}>
                {money(o.nightlyPrice, o.currency)} / noche · Total {money(o.stayTotal, o.currency)}
              </Text>
              {o.tourPath ? <Text style={st.muted}>Recorrido 360° disponible</Text> : null}
              <Button title="Ver y reservar" small onPress={() => open(o)} loading={opening === o.roomId} />
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}
