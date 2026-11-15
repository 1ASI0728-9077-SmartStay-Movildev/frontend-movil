import React from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Card, ErrorText, Header, Loading, st } from '../../components/ui';
import { useLoad } from '../../state/hooks';

export default function ProfilesAdmin({ onBack }: { onBack: () => void }) {
  const { data, loading, error, reload } = useLoad(api.profiles);

  return (
    <View style={st.flex}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Header title="Perfiles" onBack={onBack} />
        <ErrorText message={error} />
      </View>
      {loading && !data ? (
        <Loading />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          ListEmptyComponent={!error ? <Text style={st.empty}>No hay perfiles registrados.</Text> : undefined}
          renderItem={({ item }) => (
            <Card>
              <Text style={st.cardTitle}>{item.fullName}</Text>
              <Text style={st.muted}>{item.email}</Text>
              <Text style={st.muted}>{item.streetAddress}</Text>
              <Text style={st.muted}>{item.userId ? `Usuario #${item.userId}` : 'Sin usuario vinculado'}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}
