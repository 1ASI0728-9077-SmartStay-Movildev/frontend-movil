import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { RoomScene } from '../api/types';
import { sceneHtml } from '../viewer/html';

export default function SceneViewer({ scene, onError }: { scene: RoomScene; onError: () => void }) {
  const html = React.useMemo(() => sceneHtml(scene), [scene]);
  return (
    <View style={s.box}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://cdn.jsdelivr.net' }}
        javaScriptEnabled
        scrollEnabled={false}
        overScrollMode="never"
        mixedContentMode="always"
        onMessage={(e) => {
          try {
            if (JSON.parse(e.nativeEvent.data).type === 'error') onError();
          } catch {
            /* ignorar */
          }
        }}
        onError={onError}
        onHttpError={onError}
      />
    </View>
  );
}

const s = StyleSheet.create({
  box: { height: 380, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eaf0f2' },
});
