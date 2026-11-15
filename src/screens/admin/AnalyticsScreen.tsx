import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { colors, ErrorText, Header, Loading, money, st } from '../../components/ui';
import { useLoad } from '../../state/hooks';

export default function AnalyticsScreen({ onBack }: { onBack: () => void }) {
  const { data, loading, error, reload } = useLoad(api.monthlyMetrics);

  return (
    <ScrollView contentContainerStyle={st.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <Header title="Reporte del mes" onBack={onBack} />
      <ErrorText message={error} />
      {loading && !data ? (
        <Loading />
      ) : data ? (
        <>
          <View style={s.grid}>
            <Tile label="Ingresos" value={money(data.totalRevenue)} />
            <Tile label="Reservas" value={String(data.totalBookings)} />
            <Tile label="Canceladas" value={String(data.cancelledBookings)} />
            <Tile label="Ocupación" value={`${data.occupancyRate}%`} />
          </View>
          <Text style={[st.muted, { fontSize: 12 }]}>
            Mes en curso (UTC). Generado: {String(data.generatedAt).replace('T', ' ').slice(0, 19)}. Desliza hacia abajo para actualizar.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.tile}>
      <Text style={s.value}>{value}</Text>
      <Text style={st.muted}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 12, padding: 16, elevation: 1 },
  value: { fontSize: 22, fontWeight: '800', color: colors.primary },
});
