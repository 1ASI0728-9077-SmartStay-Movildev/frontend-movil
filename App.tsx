import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { Room } from './src/api/types';
import { colors, OfflineScreen } from './src/components/ui';
import BookingsScreen from './src/screens/BookingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import { SessionProvider, useSession } from './src/state/session';

type Tab = 'rooms' | 'bookings';

function Main() {
  const { user, logout } = useSession();
  const [tab, setTab] = useState<Tab>('rooms');
  const [selected, setSelected] = useState<Room | null>(null);
  const [exploring, setExploring] = useState(false);

  if (!user) return <LoginScreen />;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Smart Stay</Text>
        <Pressable onPress={logout}>
          <Text style={s.logout}>Salir ({user.username})</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {selected && exploring ? (
          <ExploreScreen room={selected} onBack={() => setExploring(false)} />
        ) : selected ? (
          <RoomDetailScreen
            room={selected}
            onExplore={() => setExploring(true)}
            onBack={() => setSelected(null)}
            onBooked={() => {
              setSelected(null);
              setExploring(false);
              setTab('bookings');
            }}
          />
        ) : tab === 'rooms' ? (
          <RoomsScreen onSelect={setSelected} />
        ) : (
          <BookingsScreen key="bookings" />
        )}
      </View>

      <View style={s.tabs}>
        {(['rooms', 'bookings'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={s.tab}
            onPress={() => {
              setSelected(null);
              setExploring(false);
              setTab(t);
            }}
          >
            <Text style={[s.tabText, tab === t && !selected && { color: colors.primary, fontWeight: '700' }]}>
              {t === 'rooms' ? 'Habitaciones' : 'Mis reservas'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((st) => {
      setOnline(st.isConnected !== false && st.isInternetReachable !== false);
    });
    return unsub;
  }, []);

  return (
    <SessionProvider>
      <SafeAreaView style={s.root}>
        <StatusBar style="dark" />
        {online ? <Main /> : <OfflineScreen />}
      </SafeAreaView>
    </SessionProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 28 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.primary },
  logout: { color: colors.muted },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { color: colors.muted, fontSize: 15 },
});
