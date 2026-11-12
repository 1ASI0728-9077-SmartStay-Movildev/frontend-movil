import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { fetchImageDataUrl } from '../api/client';
import type { Tour } from '../api/types';
import { colors, ErrorText } from './ui';
import { panoramaHtml } from '../viewer/html';

export default function PanoramaViewer({ tour }: { tour: Tour }) {
  const html = useMemo(() => panoramaHtml(), []);
  const web = useRef<React.ComponentRef<typeof WebView>>(null);
  const [loaded, setLoaded] = useState(false);
  const [nodeId, setNodeId] = useState(tour.startNodeId);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const node = tour.nodes.find((n) => n.id === nodeId);

  useEffect(() => {
    if (!loaded || !node) return;
    let cancelled = false;
    setError(null);
    fetchImageDataUrl(node.panorama)
      .then((dataUrl) => {
        if (!cancelled) web.current?.injectJavaScript(`window.setPano(${JSON.stringify(dataUrl)}); true;`);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar el panorama.');
      });
    return () => {
      cancelled = true;
    };
  }, [loaded, node, retry]);

  if (!node) return <ErrorText message="El recorrido no tiene ubicaciones válidas." />;

  return (
    <View>
      <View style={s.box}>
        <WebView
          ref={web}
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://cdn.jsdelivr.net' }}
          javaScriptEnabled
          scrollEnabled={false}
          overScrollMode="never"
          mixedContentMode="always"
          onLoadEnd={() => setLoaded(true)}
          onMessage={(e) => {
            try {
              const m = JSON.parse(e.nativeEvent.data);
              if (m.type === 'error') setError(m.code === 'texture' ? 'No se pudo mostrar el panorama.' : 'No se pudo iniciar el visor 360°.');
            } catch {
              /* ignorar */
            }
          }}
        />
      </View>
      <ErrorText message={error} />
      {error && (
        <Pressable onPress={() => setRetry((n) => n + 1)}>
          <Text style={s.retry}>Reintentar</Text>
        </Pressable>
      )}
      <Text style={s.label}>Ubicación: {node.name}</Text>
      <View style={s.chips}>
        {tour.nodes.map((n) => (
          <Pressable key={n.id} onPress={() => setNodeId(n.id)} style={[s.chip, n.id === nodeId && s.chipOn]}>
            <Text style={[s.chipText, n.id === nodeId && { color: '#fff' }]}>{n.name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.help}>Arrastra para mirar alrededor. Usa + y − para acercar.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { height: 380, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eaf0f2' },
  label: { marginTop: 10, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.primary },
  retry: { color: colors.primary, fontWeight: '600', marginBottom: 6 },
  help: { color: colors.muted, marginTop: 8, fontSize: 12 },
});
