import React, { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Card, ErrorText, Field, Header, Loading, OkText, st } from '../../components/ui';
import { useAction, useLoad } from '../../state/hooks';
import { useSession } from '../../state/session';

// Tipos de habitación, categorías de hotel y servicios. El backend solo permite crear y listar.
export default function CatalogAdmin({ onBack }: { onBack: () => void }) {
  const { isChainAdmin } = useSession();
  const { data, loading, error, reload } = useLoad(async () => {
    const [types, categories, amenities] = await Promise.all([api.roomTypes(), api.categories(), api.amenities()]);
    return { types, categories, amenities };
  });
  const act = useAction();
  const [ok, setOk] = useState<string | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [category, setCategory] = useState('');
  const [amenity, setAmenity] = useState('');

  const create = async (key: string, fn: () => Promise<unknown>, done: () => void, msg: string) => {
    setOk(null);
    if (await act.run(key, fn)) {
      done();
      setOk(msg);
      reload();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={st.screen}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
      <Header title="Catálogo" onBack={onBack} />
      <ErrorText message={error ?? act.error} />
      <OkText message={ok} />
      {loading && !data ? <Loading /> : null}

      {data && (
        <>
          <Text style={st.section}>Tipos de habitación</Text>
          {data.types.map((t) => (
            <Card key={t.id}>
              <Text style={st.cardTitle}>
                #{t.id} · {t.name}
              </Text>
              <Text style={st.muted}>{t.description}</Text>
            </Card>
          ))}
          <Field label="Nuevo tipo" value={typeName} onChangeText={setTypeName} placeholder="Ej.: Suite familiar" />
          <Field label="Descripción" value={typeDesc} onChangeText={setTypeDesc} />
          <Button
            title="Crear tipo de habitación"
            loading={act.busy === 'type'}
            disabled={!typeName.trim() || !typeDesc.trim()}
            onPress={() =>
              create(
                'type',
                () => api.createRoomType(typeName.trim(), typeDesc.trim()),
                () => {
                  setTypeName('');
                  setTypeDesc('');
                },
                'Tipo de habitación creado.',
              )
            }
          />

          <Text style={st.section}>Categorías de hotel</Text>
          <Text style={st.muted}>{data.categories.join(' · ') || 'Sin categorías.'}</Text>
          <Text style={st.section}>Servicios</Text>
          <Text style={st.muted}>{data.amenities.join(' · ') || 'Sin servicios.'}</Text>

          {isChainAdmin ? (
            <>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={st.flex}>
                  <Field label="Nueva categoría" value={category} onChangeText={setCategory} />
                </View>
                <Button
                  title="Crear"
                  small
                  loading={act.busy === 'cat'}
                  disabled={!category.trim()}
                  onPress={() => create('cat', () => api.createCategory(category.trim()), () => setCategory(''), 'Categoría creada.')}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
                <View style={st.flex}>
                  <Field label="Nuevo servicio" value={amenity} onChangeText={setAmenity} />
                </View>
                <Button
                  title="Crear"
                  small
                  loading={act.busy === 'am'}
                  disabled={!amenity.trim()}
                  onPress={() => create('am', () => api.createAmenity(amenity.trim()), () => setAmenity(''), 'Servicio creado.')}
                />
              </View>
            </>
          ) : (
            <Text style={[st.muted, { fontSize: 12 }]}>Solo el administrador de cadena puede crear categorías y servicios.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
