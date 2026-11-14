import React, { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text } from 'react-native';
import { Button } from '../components/ui';
import { Card, decode, saveCard } from '../offline/cards';
import { nearby, permissions, NearbyEvent } from '../offline/nearby';
export default function NearbyScreen({
  card,
  onBack,
}: {
  card?: Card;
  onBack: () => void;
}) {
  const [status, setStatus] = useState(
    'Activa Bluetooth y Wi-Fi en ambos teléfonos.',
  );
  const [devices, setDevices] = useState<Record<string, string>>({});
  const [verification, setVerification] = useState<NearbyEvent | null>(null);
  const mounted = useRef(true),
    generation = useRef(0);
  const active = useRef(false),
    done = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    generation.current++;
    active.current = false;
    if (timer.current) clearTimeout(timer.current);
    void nearby?.stop().catch(() => {});
    setVerification(null);
    setDevices({});
  };
  const fail = (e: unknown) => {
    stop();
    setStatus(e instanceof Error ? e.message : String(e));
  };
  useEffect(() => {
    mounted.current = true;
    const sub = nearby?.addListener('onNearby', (e) => {
      if (!active.current) return;
      const session = generation.current;
      void (async () => {
        if (e.type === 'found') setDevices((d) => ({ ...d, [e.id]: e.value }));
        if (e.type === 'lost')
          setDevices((d) => {
            const n = { ...d };
            delete n[e.id];
            return n;
          });
        if (e.type === 'verify') {
          setVerification(e);
          setStatus('Comparen el código en ambos teléfonos.');
        }
        if (e.type === 'connected') {
          setVerification(null);
          setStatus(
            card
              ? 'Enviando; esperando guardado del receptor…'
              : 'Conectado; esperando ficha…',
          );
          if (card) await nearby!.send(e.id, JSON.stringify(card));
        }
        if (e.type === 'message') {
          if (card) {
            const ack = JSON.parse(e.value);
            if (
              ack.version !== 1 ||
              ack.type !== 'room-card-ack' ||
              ack.originalMessageId !== card.messageId ||
              ack.status !== 'RECEIVED_OK'
            )
              throw Error('Confirmación inválida');
            done.current = true;
            stop();
            setStatus('El receptor confirmó que guardó la ficha.');
          } else {
            const received = decode(e.value);
            await saveCard(received);
            if (!active.current || session !== generation.current) return;
            await nearby!.send(
              e.id,
              JSON.stringify({
                version: 1,
                type: 'room-card-ack',
                originalMessageId: received.messageId,
                status: 'RECEIVED_OK',
              }),
            );
            done.current = true;
            setStatus('Ficha guardada. Ya puedes cerrar y verla sin internet.');
            // Keep endpoint alive for duplicate retransmissions until user exits or timeout.
          }
        }
        if (e.type === 'error') throw Error(e.value);
        if (e.type === 'disconnected') {
          if (!done.current) throw Error('Conexión interrumpida. Reintenta.');
          stop();
        }
      })().catch((e) => {
        if (mounted.current && session === generation.current) fail(e);
      });
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && active.current)
        fail(Error('Intercambio cancelado al salir de la app.'));
    });
    return () => {
      mounted.current = false;
      generation.current++;
      active.current = false;
      if (timer.current) clearTimeout(timer.current);
      sub?.remove();
      app.remove();
      void nearby?.stop().catch(() => {});
    };
  }, [card]);
  async function start() {
    stop();
    done.current = false;
    const session = generation.current;
    try {
      await permissions();
      if (!mounted.current || session !== generation.current) return;
      active.current = true;
      await nearby!.start(!card);
      if (!mounted.current || session !== generation.current) return;
      setStatus(
        card ? 'Buscando receptores…' : 'Visible para un emisor cercano…',
      );
      timer.current = setTimeout(() => {
        stop();
        setStatus(
          done.current ? 'Ficha guardada.' : 'Tiempo agotado. Reintenta.',
        );
      }, 60000);
    } catch (e) {
      if (mounted.current && session === generation.current) fail(e);
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Button
        title="Cerrar / cancelar"
        onPress={() => {
          stop();
          onBack();
        }}
      />
      <Text>{card ? 'Compartir cerca' : 'Recibir ficha'}</Text>
      <Text>{status}</Text>
      <Button title="Iniciar / reintentar" onPress={() => void start()} />
      {Object.entries(devices).map(([id, name]) => (
        <Button
          key={id}
          title={`Conectar con ${name} (${id})`}
          onPress={() => {
            setDevices({});
            void nearby!.connect(id).catch(fail);
          }}
        />
      ))}
      {verification && (
        <>
          <Text style={{ fontSize: 32 }}>{verification.value}</Text>
          <Text>¿El código coincide en ambos equipos?</Text>
          <Button
            title="Sí, coincide: aceptar"
            onPress={() => {
              const v = verification;
              setVerification(null);
              setStatus('Esperando aceptación del otro teléfono…');
              void nearby!.confirm(v.id, true).catch(fail);
            }}
          />
          <Button
            title="No coincide: rechazar"
            onPress={() => {
              void nearby!.confirm(verification.id, false).catch(() => {});
              stop();
              setStatus('Código rechazado. No se envió la ficha.');
            }}
          />
        </>
      )}
    </ScrollView>
  );
}
