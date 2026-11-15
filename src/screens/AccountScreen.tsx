import React, { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { api, getBaseUrl } from '../api/client';
import { Button, Card, ErrorText, Field, Header, Loading, st } from '../components/ui';
import { useAction } from '../state/hooks';
import { useSession } from '../state/session';

const roleLabel: Record<string, string> = {
  guest: 'Huésped',
  admin: 'Administrador de hotel',
  chain_admin: 'Administrador de cadena',
  staff: 'Personal',
  reception: 'Recepción',
  housekeeping: 'Limpieza',
  maintenance: 'Mantenimiento',
};

// Cuenta: datos de sesión, perfil personal y cambio de contraseña.
export default function AccountScreen() {
  const { user, profile, setProfile, logout } = useSession();
  const act = useAction();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Perú');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');

  if (!user) return null;

  const profileValid =
    [firstName, lastName, street, number, city, postalCode, country].every((v) => v.trim()) && /^\S+@\S+\.\S+$/.test(email.trim());

  const saveProfile = () =>
    act.run('profile', async () => {
      const p = await api.createProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        street: street.trim(),
        number: number.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        userId: user.id,
      });
      // El backend devuelve el perfil existente si el correo ya estaba registrado.
      if (p.userId !== null && p.userId !== user.id) throw new Error('Ese correo ya pertenece al perfil de otro usuario.');
      setProfile(p);
    });

  const passValid = current.length >= 6 && next.length >= 6 && next === repeat && next !== current;
  const changePassword = async () => {
    const ok = await act.run('pass', () => api.changePassword(current, next));
    // El backend invalida todas las sesiones al cambiar la contraseña.
    if (ok) logout('Contraseña actualizada. Inicia sesión con la nueva contraseña.');
  };

  return (
    <ScrollView contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
      <Header title="Mi cuenta" />
      <Card>
        <Text style={st.cardTitle}>{user.username}</Text>
        <Text style={st.muted}>Rol: {roleLabel[user.role] ?? user.role}</Text>
        {user.hotelId !== null && <Text style={st.muted}>Hotel asignado: #{user.hotelId}</Text>}
        {user.chainId !== null && <Text style={st.muted}>Cadena: #{user.chainId}</Text>}
        <Text style={st.muted}>Servidor: {getBaseUrl()}</Text>
      </Card>

      <Text style={st.section}>Perfil personal</Text>
      {profile === undefined ? (
        <Loading />
      ) : profile ? (
        <Card>
          <Text style={st.cardTitle}>{profile.fullName}</Text>
          <Text style={st.muted}>{profile.email}</Text>
          <Text style={st.muted}>{profile.streetAddress}</Text>
          <Text style={[st.muted, { fontSize: 12, marginTop: 4 }]}>
            Estos datos se proponen al reservar. El servidor todavía no permite editarlos.
          </Text>
        </Card>
      ) : (
        <>
          <Text style={st.muted}>Aún no tienes perfil. Complétalo para no escribir tus datos en cada reserva.</Text>
          <Field label="Nombres" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Field label="Apellidos" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <Field label="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Calle" value={street} onChangeText={setStreet} />
          <Field label="Número" value={number} onChangeText={setNumber} />
          <Field label="Ciudad" value={city} onChangeText={setCity} />
          <Field label="Código postal" value={postalCode} onChangeText={setPostalCode} />
          <Field label="País" value={country} onChangeText={setCountry} />
          <Button title="Guardar perfil" onPress={saveProfile} loading={act.busy === 'profile'} disabled={!profileValid} />
        </>
      )}

      <Text style={st.section}>Cambiar contraseña</Text>
      <Field label="Contraseña actual" value={current} onChangeText={setCurrent} secureTextEntry />
      <Field label="Nueva contraseña (mínimo 6)" value={next} onChangeText={setNext} secureTextEntry />
      <Field label="Repite la nueva contraseña" value={repeat} onChangeText={setRepeat} secureTextEntry />
      {next !== '' && repeat !== '' && next !== repeat && <Text style={st.muted}>Las contraseñas no coinciden.</Text>}
      <Button title="Cambiar contraseña" onPress={changePassword} loading={act.busy === 'pass'} disabled={!passValid} />
      <Text style={[st.muted, { fontSize: 12 }]}>Al cambiarla se cierra la sesión y debes volver a ingresar.</Text>

      <ErrorText message={act.error} />
      <Button title="Cerrar sesión" variant="outline" onPress={() => logout()} />
    </ScrollView>
  );
}
