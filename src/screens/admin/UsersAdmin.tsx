import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../../api/client';
import type { UserItem } from '../../api/types';
import { Button, Card, Chips, colors, confirmAction, ErrorText, Field, Header, Loading, num, OkText, st } from '../../components/ui';
import { useAction, useLoad } from '../../state/hooks';
import { useSession } from '../../state/session';

const roleLabels: Record<string, string> = {
  guest: 'Huésped',
  staff: 'Personal',
  reception: 'Recepción',
  housekeeping: 'Limpieza',
  maintenance: 'Mantenimiento',
  admin: 'Admin de hotel',
  chain_admin: 'Admin de cadena',
};
const USERNAME_RE = /^[a-zA-Z0-9_.@]{3,100}$/;

type Create = { username: string; password: string; role: string; hotelId: string; chainId: string };
type Edit = { user: UserItem; username: string; password: string; hotelId: string; chainId: string; role: string };

// Gestión de usuarios. El servidor aplica la jerarquía: solo se gestionan roles inferiores al propio
// y, para un admin de hotel, solo usuarios de su hotel.
export default function UsersAdmin({ onBack }: { onBack: () => void }) {
  const { user, isChainAdmin } = useSession();
  const { data, loading, error, reload } = useLoad(api.users);
  const act = useAction();
  const [ok, setOk] = useState<string | null>(null);
  const [create, setCreate] = useState<Create | null>(null);
  const [edit, setEdit] = useState<Edit | null>(null);

  // Un rol solo puede asignar roles de menor jerarquía que el suyo.
  const roles = isChainAdmin
    ? ['guest', 'staff', 'reception', 'housekeeping', 'maintenance', 'admin']
    : ['guest', 'staff', 'reception', 'housekeeping', 'maintenance'];

  const closeForms = () => {
    act.setError(null);
    setCreate(null);
    setEdit(null);
  };

  const toggle = (u: UserItem) => {
    const active = u.status.toLowerCase() === 'active';
    const go = async () => {
      setOk(null);
      if (await act.run(`s${u.id}`, () => (active ? api.deactivateUser(u.id) : api.activateUser(u.id)))) reload();
    };
    if (active) confirmAction('Desactivar usuario', `¿Desactivar a "${u.username}"? No podrá iniciar sesión.`, 'Desactivar', go);
    else go();
  };

  if (create) {
    const valid = USERNAME_RE.test(create.username.trim()) && create.password.length >= 6 && create.role !== '';
    const save = async () => {
      const done = await act.run('save', () =>
        api.createUser({
          username: create.username.trim(),
          password: create.password,
          role: create.role,
          hotelId: num(create.hotelId) ?? null,
          chainId: num(create.chainId) ?? null,
        }),
      );
      if (done) {
        setCreate(null);
        setOk('Usuario creado.');
        reload();
      }
    };
    return (
      <ScrollView contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
        <Header title="Nuevo usuario" onBack={closeForms} />
        <Field label="Usuario" value={create.username} onChangeText={(v) => setCreate({ ...create, username: v })} autoCapitalize="none" autoCorrect={false} />
        <Field label="Contraseña (mínimo 6)" value={create.password} onChangeText={(v) => setCreate({ ...create, password: v })} secureTextEntry />
        <Text style={st.label}>Rol</Text>
        <Chips options={roles} labels={roleLabels} value={create.role} onChange={(v) => setCreate({ ...create, role: v })} />
        <Field label="ID de hotel (opcional)" value={create.hotelId} onChangeText={(v) => setCreate({ ...create, hotelId: v })} keyboardType="number-pad" />
        {isChainAdmin && (
          <Field label="ID de cadena (opcional)" value={create.chainId} onChangeText={(v) => setCreate({ ...create, chainId: v })} keyboardType="number-pad" />
        )}
        <ErrorText message={act.error} />
        <Button title="Crear usuario" onPress={save} loading={act.busy === 'save'} disabled={!valid} />
      </ScrollView>
    );
  }

  if (edit) {
    const u = edit.user;
    const newUsername = edit.username.trim() !== u.username ? edit.username.trim() : undefined;
    const newPassword = edit.password !== '' ? edit.password : undefined;
    const hotel = num(edit.hotelId);
    const chain = num(edit.chainId);
    const newHotelId = hotel !== undefined && hotel !== u.hotelId ? hotel : undefined;
    const newChainId = chain !== undefined && chain !== u.chainId ? chain : undefined;
    const changed = newUsername !== undefined || newPassword !== undefined || newHotelId !== undefined || newChainId !== undefined;
    const valid = changed && (newUsername === undefined || USERNAME_RE.test(newUsername)) && (newPassword === undefined || newPassword.length >= 6);

    const save = async () => {
      if (await act.run('save', () => api.updateUser(u.id, { newUsername, newPassword, newHotelId, newChainId }))) {
        setEdit(null);
        setOk('Usuario actualizado. Sus sesiones abiertas se cerraron.');
        reload();
      }
    };
    const saveRole = async () => {
      if (await act.run('role', () => api.assignRole(u.id, edit.role))) {
        setEdit(null);
        setOk('Rol actualizado.');
        reload();
      }
    };
    return (
      <ScrollView contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
        <Header title={`Editar usuario #${u.id}`} onBack={closeForms} />
        <Field label="Usuario" value={edit.username} onChangeText={(v) => setEdit({ ...edit, username: v })} autoCapitalize="none" autoCorrect={false} />
        <Field label="Nueva contraseña (vacío = no cambiar)" value={edit.password} onChangeText={(v) => setEdit({ ...edit, password: v })} secureTextEntry />
        <Field label="ID de hotel" value={edit.hotelId} onChangeText={(v) => setEdit({ ...edit, hotelId: v })} keyboardType="number-pad" />
        {isChainAdmin && <Field label="ID de cadena" value={edit.chainId} onChangeText={(v) => setEdit({ ...edit, chainId: v })} keyboardType="number-pad" />}
        <Button title="Guardar cambios" onPress={save} loading={act.busy === 'save'} disabled={!valid} />

        <Text style={st.section}>Rol</Text>
        <Chips options={roles} labels={roleLabels} value={edit.role} onChange={(v) => setEdit({ ...edit, role: v })} />
        <Button title="Asignar rol" variant="outline" onPress={saveRole} loading={act.busy === 'role'} disabled={edit.role === u.role} />
        <ErrorText message={act.error} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={st.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <Header title="Usuarios" onBack={onBack} />
      <Button
        title="Nuevo usuario"
        onPress={() => {
          setOk(null);
          setCreate({ username: '', password: '', role: 'guest', hotelId: user?.hotelId ? String(user.hotelId) : '', chainId: '' });
        }}
      />
      <OkText message={ok} />
      <ErrorText message={error ?? act.error} />
      {loading && !data ? <Loading /> : null}
      {data && data.length === 0 && <Text style={st.empty}>No hay usuarios en tu ámbito.</Text>}
      {(data ?? []).map((u) => {
        const active = u.status.toLowerCase() === 'active';
        const self = u.id === user?.id;
        return (
          <Card key={u.id}>
            <Text style={st.cardTitle}>
              #{u.id} · {u.username}
              {self ? ' (tú)' : ''}
            </Text>
            <Text style={st.muted}>
              {roleLabels[u.role] ?? u.role}
              {u.hotelId !== null ? ` · Hotel #${u.hotelId}` : ''}
              {u.chainId !== null ? ` · Cadena #${u.chainId}` : ''}
            </Text>
            <Text style={{ color: active ? colors.ok : colors.muted, fontWeight: '700' }}>{active ? 'Activo' : 'Inactivo'}</Text>
            {!self && (
              <View style={[st.row, { marginTop: 6 }]}>
                <Button
                  title="Editar"
                  small
                  variant="outline"
                  onPress={() => {
                    setOk(null);
                    setEdit({
                      user: u,
                      username: u.username,
                      password: '',
                      hotelId: u.hotelId !== null ? String(u.hotelId) : '',
                      chainId: u.chainId !== null ? String(u.chainId) : '',
                      role: u.role,
                    });
                  }}
                />
                <Button
                  title={active ? 'Desactivar' : 'Activar'}
                  small
                  variant={active ? 'danger' : 'outline'}
                  onPress={() => toggle(u)}
                  loading={act.busy === `s${u.id}`}
                />
              </View>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}
