import React, { useRef, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { api } from '../api/client';
import type { Booking, Payment } from '../api/types';
import { Button, Card, day, ErrorText, errMsg, Field, Header, money, OkText, st } from '../components/ui';

// Algoritmo de Luhn: el backend rechaza números de tarjeta que no lo cumplen.
function luhn(digits: string) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0;
}

const newKey = () => `mob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function PaymentReceipt({ payment }: { payment: Payment }) {
  const label: Record<string, string> = {
    Completed: 'Aprobado',
    Failed: 'Rechazado',
    Pending: 'Pendiente',
    Refunded: 'Reembolsado',
  };
  return (
    <Card>
      <Text style={st.cardTitle}>Pago #{payment.id}</Text>
      <Text style={st.muted}>Estado: {label[payment.status] ?? payment.status}</Text>
      <Text style={st.muted}>Monto: {money(payment.amount)}</Text>
      <Text style={st.muted}>Tarjeta: {payment.cardNumberMasked}</Text>
      <Text style={st.muted}>Transacción: {payment.transactionId}</Text>
      <Text style={st.muted}>Fecha: {String(payment.paymentDate).replace('T', ' ').replace('Z', ' UTC')}</Text>
    </Card>
  );
}

export default function PaymentScreen({
  booking,
  onBack,
  onDone,
}: {
  booking: Booking;
  onBack: () => void;
  onDone: () => void;
}) {
  const [holder, setHolder] = useState(booking.guestName ?? '');
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  // La misma clave en un reintento evita que el backend cobre dos veces.
  const key = useRef(newKey());

  const digits = card.replace(/\D/g, '');
  const expOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(exp);
  const valid = holder.trim().length > 1 && luhn(digits) && expOk && /^\d{3,4}$/.test(cvv);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const p = await api.pay(
        {
          bookingId: booking.id,
          amount: booking.totalAmount,
          paymentMethod: 'CreditCard',
          cardNumber: digits,
          cardHolderName: holder.trim(),
          expirationDate: exp,
          cvv,
        },
        key.current,
      );
      setPayment(p);
      // Un pago rechazado permite reintentar con otra tarjeta.
      if (p.status !== 'Completed') key.current = newKey();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  if (payment?.status === 'Completed') {
    return (
      <ScrollView contentContainerStyle={st.screen}>
        <Header title="Pago aprobado" />
        <PaymentReceipt payment={payment} />
        <Text style={st.muted}>
          La reserva #{booking.id} pasa a "Confirmada" en unos segundos. Si aún aparece pendiente, desliza hacia abajo
          en la lista para actualizar.
        </Text>
        <Button title="Ver reservas" onPress={onDone} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
      <Header title={`Pagar reserva #${booking.id}`} onBack={onBack} />
      <Card>
        <Text style={st.muted}>
          {day(booking.checkInDate)} → {day(booking.checkOutDate)}
        </Text>
        <Text style={st.price}>Total: {money(booking.totalAmount, booking.currency)}</Text>
      </Card>
      <Text style={st.note}>
        Pago simulado: no se cobra dinero real. Usa una tarjeta de prueba como 4242 4242 4242 4242.
      </Text>

      <Field label="Titular de la tarjeta" value={holder} onChangeText={setHolder} autoCapitalize="words" />
      <Field
        label="Número de tarjeta"
        value={card}
        onChangeText={setCard}
        keyboardType="number-pad"
        maxLength={23}
        placeholder="4242 4242 4242 4242"
      />
      <Field
        label="Vencimiento (MM/AA)"
        value={exp}
        onChangeText={setExp}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        placeholder="12/28"
      />
      <Field label="CVV" value={cvv} onChangeText={setCvv} keyboardType="number-pad" maxLength={4} secureTextEntry />

      {digits.length >= 13 && !luhn(digits) && <Text style={st.muted}>El número de tarjeta no es válido.</Text>}
      {payment && payment.status !== 'Completed' && (
        <ErrorText message="El pago fue rechazado. Prueba con otra tarjeta." />
      )}
      <ErrorText message={error} />
      <OkText message={null} />
      <Button title={`Pagar ${money(booking.totalAmount, booking.currency)}`} onPress={submit} loading={loading} disabled={!valid} />
    </ScrollView>
  );
}
