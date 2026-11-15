import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../../api/client';
import type { Hotel } from '../../api/types';
import { Button, Card, Chips, confirmAction, ErrorText, Field, Header, Loading, money, MultiChips, st } from '../../components/ui';
import { useAction, useLoad } from '../../state/hooks';
import { useSession } from '../../state/session';

type Form = {
  id: number | null;
  name: string;
  address: string;
  city: string;
  country: string;
  imageUrl: string;
  description: string;
  type: string;
  amenities: string[];
};

const empty: Form = { id: null, name: '', address: '', city: '', country: 'Perú', imageUrl: '', description: '', type: '', amenities: [] };

// El backend devuelve la ubicación como "dirección, ciudad, país"; se separa para poder editarla.
function toForm(h: Hotel): Form {
  const parts = h.location.split(',').map((x) => x.trim());
  const country = parts.length > 1 ? (parts.pop() ?? '') : '';
  const city = parts.length > 1 ? (parts.pop() ?? '') : '';
  return {
    id: h.id,
    name: h.name,
    address: parts.join(', '),
    city,
    country,
    imageUrl: h.imageUrl,
    description: h.description,
    type: h.type,
    amenities: h.amenities ?? [],
  };
}

export default function HotelsAdmin({ onBack }: { onBack: () => void }) {
  const { user, isChainAdmin } = useSession();
  const { data, loading, error, reload } = useLoad(async () => {
    const [hotels, categories, amenities] = await Promise.all([api.hotels(), api.categories(), api.amenities()]);
    return { hotels, categories, amenities };
  });
  const act = useAction();
  const [form, setForm] = useState<Form | null>(null);
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const canManage = (h: Hotel) => isChainAdmin || user?.hotelId === h.id;

  const remove = (h: Hotel) =>
    confirmAction('Eliminar hotel', `¿Eliminar "${h.name}"? Esta acción no se puede deshacer.`, 'Eliminar', async () => {
      if (await act.run(`d${h.id}`, () => api.deleteHotel(h.id))) reload();
    });

  if (form) {
    const valid = [form.name, form.address, form.city, form.country, form.imageUrl, form.description, form.type].every((v) => v.trim());
    const save = async () => {
      const body = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        imageUrl: form.imageUrl.trim(),
        description: form.description.trim(),
        type: form.type.trim(),
        amenities: form.amenities,
      };
      const ok = await act.run('save', () =>
        form.id === null ? api.createHotel({ ...body, hostId: user?.id ?? 0 }) : api.updateHotel(form.id, body),
      );
      if (ok) {
        setForm(null);
        reload();
      }
    };
    return (
      <ScrollView contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
        <Header
          title={form.id === null ? 'Nuevo hotel' : `Editar hotel #${form.id}`}
          onBack={() => {
            act.setError(null);
            setForm(null);
          }}
        />
        <Field label="Nombre" value={form.name} onChangeText={(v) => set({ name: v })} />
        <Field label="Dirección" value={form.address} onChangeText={(v) => set({ address: v })} />
        <Field label="Ciudad" value={form.city} onChangeText={(v) => set({ city: v })} />
        <Field label="País" value={form.country} onChangeText={(v) => set({ country: v })} />
        <Field label="URL de la imagen" value={form.imageUrl} onChangeText={(v) => set({ imageUrl: v })} autoCapitalize="none" keyboardType="url" />
        <Field
          label="Descripción"
          value={form.description}
          onChangeText={(v) => set({ description: v })}
          multiline
          style={{ minHeight: 70, textAlignVertical: 'top' }}
        />
        <Text style={st.label}>Categoría</Text>
        <Chips options={data?.categories ?? []} value={form.type} onChange={(v) => set({ type: v })} />
        <Field value={form.type} onChangeText={(v) => set({ type: v })} placeholder="O escribe la categoría" />
        <Text style={st.label}>Servicios</Text>
        <MultiChips
          options={Array.from(new Set([...(data?.amenities ?? []), ...form.amenities]))}
          values={form.amenities}
          onChange={(v) => set({ amenities: v })}
        />
        <ErrorText message={act.error} />
        <Button title="Guardar" onPress={save} loading={act.busy === 'save'} disabled={!valid} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={st.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <Header title="Hoteles" onBack={onBack} />
      <Button title="Nuevo hotel" onPress={() => setForm(empty)} />
      <ErrorText message={error ?? act.error} />
      {loading && !data ? <Loading /> : null}
      {data && data.hotels.length === 0 && <Text style={st.empty}>No hay hoteles.</Text>}
      {(data?.hotels ?? []).map((h) => (
        <Card key={h.id}>
          <Text style={st.cardTitle}>
            #{h.id} · {h.name}
          </Text>
          <Text style={st.muted}>{h.location}</Text>
          <Text style={st.muted}>
            {h.type}
            {h.basePrice > 0 ? ` · desde ${money(h.basePrice)}` : ''}
          </Text>
          {h.amenities?.length > 0 && <Text style={st.muted}>Servicios: {h.amenities.join(', ')}</Text>}
          {canManage(h) ? (
            <View style={[st.row, { marginTop: 6 }]}>
              <Button title="Editar" small variant="outline" onPress={() => setForm(toForm(h))} />
              <Button title="Eliminar" small variant="danger" onPress={() => remove(h)} loading={act.busy === `d${h.id}`} />
            </View>
          ) : (
            <Text style={[st.muted, { fontSize: 12 }]}>Fuera de tu ámbito: solo lectura.</Text>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}
