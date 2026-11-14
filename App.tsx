import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import BiometricGate from './src/components/BiometricGate';
import SavedCardsScreen from './src/screens/SavedCardsScreen';
import NearbyScreen from './src/screens/NearbyScreen';
import { Card } from './src/offline/cards';
import type { Room } from './src/api/types';
import { colors, OfflineScreen } from './src/components/ui';
import BookingsScreen from './src/screens/BookingsScreen';
import LoginScreen from './src/screens/LoginScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import { SessionProvider, useSession } from './src/state/session';

type Tab = 'rooms' | 'bookings';

function Main({
  online,
  initialRoom,
}: {
  online: boolean;
  initialRoom?: Room | null;
}) {
  const { user, logout } = useSession();
  const [tab, setTab] = useState<Tab>('rooms');
  const [selected, setSelected] = useState<Room | null>(initialRoom ?? null);
  const [exploring, setExploring] = useState(false);

  if (!user) return <LoginScreen />;
  if (!online) return <OfflineScreen />;

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
            <Text
              style={[
                s.tabText,
                tab === t &&
                  !selected && { color: colors.primary, fontWeight: '700' },
              ]}
            >
              {t === 'rooms' ? 'Habitaciones' : 'Mis reservas'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Shell({ online }: { online: boolean }) {
  const { user } = useSession();
  const [page, setPage] = useState<'app' | 'saved' | 'receive' | 'share'>(
    'app',
  );
  const [card, setCard] = useState<Card | undefined>();
  const [current, setCurrent] = useState<Room | null>(null);
  const [notice, setNotice] = useState('');
  const publicView =
    page === 'receive' || page === 'share' ? (
      <NearbyScreen
        card={page === 'share' ? card : undefined}
        onBack={() => setPage('saved')}
      />
    ) : page === 'saved' ? (
      <SavedCardsScreen
        online={online}
        onShare={(c) => {
          setCard(c);
          setPage('share');
        }}
        onCurrent={(r) => {
          if (!user) {
            setNotice('Inicia sesión para consultar el catálogo y reservar.');
            setPage('app');
          } else {
            setCurrent(r);
            setPage('app');
          }
        }}
      />
    ) : null;
  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabs}>
        <Pressable
          style={s.tab}
          onPress={() => {
            setPage('app');
            setCurrent(null);
          }}
        >
          <Text>Inicio</Text>
        </Pressable>
        <Pressable style={s.tab} onPress={() => setPage('saved')}>
          <Text>Fichas guardadas</Text>
        </Pressable>
        <Pressable style={s.tab} onPress={() => setPage('receive')}>
          <Text>Recibir ficha</Text>
        </Pressable>
      </View>
      {!!notice && <Text>{notice}</Text>}
      {user ? (
        <BiometricGate key={`${user.id}:${user.token}`}>
          {publicView ?? <Main online={online} initialRoom={current} />}
        </BiometricGate>
      ) : (
        (publicView ?? (online ? <LoginScreen /> : <OfflineScreen />))
      )}
    </View>
  );
}

export default function App() {
  const [online, setOnline] = useState(false);
  useEffect(
    () =>
      NetInfo.addEventListener((st) =>
        setOnline(st.isConnected === true && st.isInternetReachable !== false),
      ),
    [],
  );
  return (
    <SessionProvider>
      <SafeAreaView style={s.root}>
        <StatusBar style="dark" />
        <Shell online={online} />
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { color: colors.muted, fontSize: 15 },
});
