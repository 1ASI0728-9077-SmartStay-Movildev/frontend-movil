import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { Room } from './src/api/types';
import { colors, OfflineScreen } from './src/components/ui';
import AccountScreen from './src/screens/AccountScreen';
import AdminHome from './src/screens/admin/AdminHome';
import BookingsScreen from './src/screens/BookingsScreen';
import ConciergeScreen from './src/screens/ConciergeScreen';
import type { StayDates } from './src/screens/ConciergeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import LoginScreen from './src/screens/LoginScreen';
import RoomDetailScreen from './src/screens/RoomDetailScreen';
import RoomsScreen from './src/screens/RoomsScreen';
import { SessionProvider, useSession } from './src/state/session';

type Tab = 'manage' | 'rooms' | 'concierge' | 'bookings' | 'account';

const tabLabels: Record<Tab, string> = {
  manage: 'Gestión',
  rooms: 'Habitaciones',
  concierge: 'Asistente',
  bookings: 'Reservas',
  account: 'Cuenta',
};

function Main() {
  const { user, isAdmin, logout } = useSession();
  // Los administradores ven además el panel de gestión.
  const tabs: Tab[] = isAdmin
    ? ['manage', 'rooms', 'concierge', 'bookings', 'account']
    : ['rooms', 'concierge', 'bookings', 'account'];
  const [tab, setTab] = useState<Tab>(isAdmin ? 'manage' : 'rooms');
  const [selected, setSelected] = useState<Room | null>(null);
  const [dates, setDates] = useState<StayDates | null>(null);
  const [exploring, setExploring] = useState(false);
  // Cambia para reiniciar la pestaña al volver a tocarla.
  const [nonce, setNonce] = useState(0);

  const closeRoom = () => {
    setSelected(null);
    setDates(null);
    setExploring(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Smart Stay</Text>
        <Pressable onPress={() => logout()} hitSlop={8}>
          <Text style={s.logout}>Salir ({user?.username})</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {selected && exploring ? (
          <ExploreScreen room={selected} onBack={() => setExploring(false)} />
        ) : selected ? (
          <RoomDetailScreen
            room={selected}
            initialDates={dates}
            onExplore={() => setExploring(true)}
            onBack={closeRoom}
            onBooked={() => {
              closeRoom();
              setTab('bookings');
              setNonce((n) => n + 1);
            }}
          />
        ) : null}
        {/* Buscar y Asistente siguen montados para conservar los resultados al volver de una habitación. */}
        <View style={!selected && tab === 'rooms' ? s.fill : s.hidden}>
          <RoomsScreen onSelect={setSelected} />
        </View>
        <View style={!selected && tab === 'concierge' ? s.fill : s.hidden}>
          <ConciergeScreen
            onSelect={(room, d) => {
              setDates(d);
              setSelected(room);
            }}
          />
        </View>
        {!selected && tab === 'manage' && <AdminHome key={`m${nonce}`} />}
        {!selected && tab === 'bookings' && <BookingsScreen key={`b${nonce}`} />}
        {!selected && tab === 'account' && <AccountScreen />}
      </View>

      <View style={s.tabs}>
        {tabs.map((t) => (
          <Pressable
            key={t}
            style={s.tab}
            onPress={() => {
              closeRoom();
              setTab(t);
              setNonce((n) => n + 1);
            }}
          >
            <Text
              numberOfLines={1}
              style={[s.tabText, isAdmin && { fontSize: 12 }, tab === t && !selected && { color: colors.primary, fontWeight: '700' }]}
            >
              {tabLabels[t]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Root() {
  const { user } = useSession();
  // La clave reinicia toda la navegación cuando cambia el usuario.
  return user ? <Main key={user.id} /> : <LoginScreen />;
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
        {online ? <Root /> : <OfflineScreen />}
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
  tabText: { color: colors.muted, fontSize: 14 },
  fill: { flex: 1 },
  hidden: { display: 'none' },
});
