import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Card, Header, st } from '../../components/ui';
import { useSession } from '../../state/session';
import AnalyticsScreen from './AnalyticsScreen';
import CatalogAdmin from './CatalogAdmin';
import HotelsAdmin from './HotelsAdmin';
import ProfilesAdmin from './ProfilesAdmin';
import RoomsAdmin from './RoomsAdmin';
import UsersAdmin from './UsersAdmin';

type Section = 'hotels' | 'rooms' | 'catalog' | 'users' | 'profiles' | 'analytics';

const sections: { id: Section; title: string; text: string }[] = [
  { id: 'hotels', title: 'Hoteles', text: 'Crear, editar y eliminar hoteles.' },
  { id: 'rooms', title: 'Habitaciones', text: 'Crear, editar y eliminar habitaciones; diseñar su vista 3D.' },
  { id: 'catalog', title: 'Catálogo', text: 'Tipos de habitación, categorías y servicios.' },
  { id: 'users', title: 'Usuarios', text: 'Crear usuarios, cambiar roles y activar o desactivar cuentas.' },
  { id: 'profiles', title: 'Perfiles', text: 'Datos de contacto registrados por los usuarios.' },
  { id: 'analytics', title: 'Reporte del mes', text: 'Ingresos, reservas, cancelaciones y ocupación.' },
];

// Panel de administración (roles admin y chain_admin).
export default function AdminHome() {
  const { user } = useSession();
  const [section, setSection] = useState<Section | null>(null);
  const back = () => setSection(null);

  if (section === 'hotels') return <HotelsAdmin onBack={back} />;
  if (section === 'rooms') return <RoomsAdmin onBack={back} />;
  if (section === 'catalog') return <CatalogAdmin onBack={back} />;
  if (section === 'users') return <UsersAdmin onBack={back} />;
  if (section === 'profiles') return <ProfilesAdmin onBack={back} />;
  if (section === 'analytics') return <AnalyticsScreen onBack={back} />;

  return (
    <ScrollView contentContainerStyle={st.screen}>
      <Header title="Gestión" />
      <Text style={st.muted}>
        {user?.role === 'chain_admin'
          ? 'Administras toda la cadena.'
          : `Administras el hotel #${user?.hotelId ?? '–'}. El servidor rechaza cambios en otros hoteles.`}
      </Text>
      {sections.map((x) => (
        <Card key={x.id} onPress={() => setSection(x.id)}>
          <Text style={st.cardTitle}>{x.title}</Text>
          <Text style={st.muted}>{x.text}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
