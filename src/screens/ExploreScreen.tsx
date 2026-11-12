import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, validScene } from '../api/client';
import type { Room, RoomScene, Tour } from '../api/types';
import PanoramaViewer from '../components/PanoramaViewer';
import SceneViewer from '../components/SceneViewer';
import { Button, colors, ErrorText, Loading } from '../components/ui';

type Mode = 'scene' | 'tour';

export default function ExploreScreen({ room, onBack }: { room: Room; onBack: () => void }) {
  const [mode, setMode] = useState<Mode>(room.hasVr || !room.tourPath ? 'scene' : 'tour');
  const [scene, setScene] = useState<RoomScene | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerFailed, setViewerFailed] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setViewerFailed(false);
    setLoading(true);
    try {
      if (mode === 'scene') {
        const data = await api.roomScene(room.roomId);
        if (!validScene(data)) throw new Error('La escena 3D recibida no es válida.');
        setScene(data);
      } else {
        const data = await api.roomTour(room.roomId);
        if (!data?.nodes?.length || !data.nodes.some((n) => n.id === data.startNodeId)) {
          throw new Error('El recorrido 360° recibido no es válido.');
        }
        setTour(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [mode, room.roomId]);

  useEffect(() => {
    if ((mode === 'scene' && !scene) || (mode === 'tour' && !tour)) load();
    else setError(null);
  }, [mode, scene, tour, load]);

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Button title="← Volver" variant="outline" onPress={onBack} />
      <Text style={s.title}>
        {room.hotelName} · #{room.roomId}
      </Text>
      <View style={s.tabs}>
        <View style={{ flex: 1 }}>
          <Button title="Habitación 3D" variant={mode === 'scene' ? 'primary' : 'outline'} onPress={() => setMode('scene')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Recorrido 360°" variant={mode === 'tour' ? 'primary' : 'outline'} onPress={() => setMode('tour')} />
        </View>
      </View>

      {loading && <Loading />}
      <ErrorText message={error ?? (viewerFailed ? 'No se pudo iniciar el visor. Revisa tu conexión.' : null)} />
      {(error || viewerFailed) && !loading && <Button title="Reintentar" variant="outline" onPress={load} />}

      {mode === 'scene' && scene && !loading && !error && (
        <>
          <View style={s.facts}>
            <Text style={s.fact}>{scene.room.areaM2 ?? '–'} m²</Text>
            <Text style={s.fact}>
              {scene.room.widthM} × {scene.room.lengthM} m
            </Text>
            <Text style={s.fact}>Altura: {scene.room.heightM} m</Text>
          </View>
          <SceneViewer scene={scene} onError={() => setViewerFailed(true)} />
          <Text style={s.help}>Arrastra para rotar y pellizca con dos dedos para acercar o desplazar.</Text>
          {(scene.panels ?? []).map((p) => (
            <Text key={p.id} style={s.fact}>
              {p.title}: {p.text}
            </Text>
          ))}
          <Text style={s.help}>Representación esquemática basada en las dimensiones y distribución del alojamiento.</Text>
        </>
      )}
      {mode === 'tour' && tour && !loading && !error && <PanoramaViewer tour={tour} />}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  tabs: { flexDirection: 'row', gap: 8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { backgroundColor: colors.soft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: colors.text },
  help: { color: colors.muted, fontSize: 12 },
});
