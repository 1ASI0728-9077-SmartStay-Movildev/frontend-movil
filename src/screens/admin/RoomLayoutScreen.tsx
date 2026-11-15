import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api, validScene } from '../../api/client';
import type { LayoutPreview, RoomLayout, RoomScene } from '../../api/types';
import SceneViewer from '../../components/SceneViewer';
import { Button, Card, Chips, ErrorText, Field, Header, Loading, num, OkText, st } from '../../components/ui';
import { useAction, useLoad } from '../../state/hooks';

type Opening = { wall: string; offset: string; width: string };
type Bed = { type: string; x: string; z: string; rot: string };
type Form = {
  widthM: string;
  lengthM: string;
  heightM: string;
  floor: string;
  wallColor: string;
  beds: Bed[];
  windows: Opening[];
  door: Opening;
};

const WALLS = ['N', 'S', 'E', 'W'];
const wallLabels: Record<string, string> = { N: 'Norte', S: 'Sur', E: 'Este', W: 'Oeste' };
const rotLabels: Record<string, string> = { '0': 'Vertical (0°)', '90': 'Horizontal (90°)' };

const blank: Form = {
  widthM: '4',
  lengthM: '5',
  heightM: '2.6',
  floor: 'Wood',
  wallColor: '#F2EFE9',
  beds: [{ type: 'Queen', x: '2', z: '1.2', rot: '0' }],
  windows: [{ wall: 'N', offset: '1', width: '1.5' }],
  door: { wall: 'S', offset: '0.5', width: '0.9' },
};

const fromLayout = (l: RoomLayout): Form => ({
  widthM: String(l.widthM),
  lengthM: String(l.lengthM),
  heightM: String(l.heightM),
  floor: l.floor,
  wallColor: l.wallColor,
  beds: (l.beds ?? []).map((b) => ({ type: b.type, x: String(b.x), z: String(b.z), rot: String(((b.rotationDeg % 180) + 180) % 180 === 0 ? 0 : 90) })),
  windows: (l.windows ?? []).map((w) => ({ wall: w.wall.toUpperCase(), offset: String(w.offset), width: String(w.width) })),
  door: l.door ? { wall: l.door.wall.toUpperCase(), offset: String(l.door.offset), width: String(l.door.width) } : blank.door,
});

const n = (v: string) => num(v) ?? NaN;
const toLayout = (f: Form): RoomLayout => ({
  widthM: n(f.widthM),
  lengthM: n(f.lengthM),
  heightM: n(f.heightM),
  floor: f.floor,
  wallColor: f.wallColor.trim(),
  beds: f.beds.map((b) => ({ type: b.type, x: n(b.x), z: n(b.z), rotationDeg: Number(b.rot) })),
  windows: f.windows.map((w) => ({ wall: w.wall, offset: n(w.offset), width: n(w.width) })),
  door: { wall: f.door.wall, offset: n(f.door.offset), width: n(f.door.width) },
});

const allNumbers = (l: RoomLayout) =>
  [l.widthM, l.lengthM, l.heightM, l.door.offset, l.door.width, ...l.beds.flatMap((b) => [b.x, b.z]), ...l.windows.flatMap((w) => [w.offset, w.width])].every(
    Number.isFinite,
  );

// Editor del layout de una habitación. De estos datos el backend genera la vista 3D.
export default function RoomLayoutScreen({ roomId, onBack }: { roomId: number; onBack: () => void }) {
  const [form, setForm] = useState<Form | null>(null);
  const [preview, setPreview] = useState<LayoutPreview | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [scene, setScene] = useState<RoomScene | null>(null);
  const act = useAction();

  const { data: catalog, loading, error } = useLoad(async () => {
    const [cat, view] = await Promise.all([api.layoutCatalog(), api.roomLayout(roomId)]);
    setForm(view?.layout ? fromLayout(view.layout) : blank);
    return cat;
  });

  if (loading || !form || !catalog) {
    return (
      <View style={st.screen}>
        <Header title={`Diseño 3D · habitación #${roomId}`} onBack={onBack} />
        <ErrorText message={error} />
        {loading && <Loading />}
      </View>
    );
  }

  const set = (patch: Partial<Form>) => {
    setForm({ ...form, ...patch });
    setPreview(null);
    setSaved(null);
    setScene(null);
  };
  const setBed = (i: number, patch: Partial<Bed>) => set({ beds: form.beds.map((b, k) => (k === i ? { ...b, ...patch } : b)) });
  const setWindow = (i: number, patch: Partial<Opening>) => set({ windows: form.windows.map((w, k) => (k === i ? { ...w, ...patch } : w)) });

  const layout = toLayout(form);
  const complete = allNumbers(layout);
  const bedLabels = Object.fromEntries(catalog.beds.map((b) => [b.type, `${b.label} (${b.widthM}×${b.lengthM} m)`]));

  const validate = () => act.run('validate', async () => setPreview(await api.layoutPreview(layout)));

  const save = () =>
    act.run('save', async () => {
      const p = await api.layoutPreview(layout);
      setPreview(p);
      if (!p.isValid) return;
      await api.saveRoomLayout(roomId, layout);
      setSaved('Diseño guardado. Los huéspedes ya pueden ver esta habitación en 3D.');
    });

  const view3d = () =>
    act.run('scene', async () => {
      const sc = await api.roomScene(roomId);
      if (!validScene(sc)) throw new Error('La escena 3D recibida no es válida.');
      setScene(sc);
    });

  return (
    <ScrollView contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
      <Header title={`Diseño 3D · habitación #${roomId}`} onBack={onBack} />
      <Text style={st.muted}>
        Medidas en metros. Lados de {catalog.minSideM} a {catalog.maxSideM} m, altura de {catalog.minHeightM} a {catalog.maxHeightM} m.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={st.flex}>
          <Field label="Ancho" value={form.widthM} onChangeText={(v) => set({ widthM: v })} keyboardType="decimal-pad" />
        </View>
        <View style={st.flex}>
          <Field label="Largo" value={form.lengthM} onChangeText={(v) => set({ lengthM: v })} keyboardType="decimal-pad" />
        </View>
        <View style={st.flex}>
          <Field label="Altura" value={form.heightM} onChangeText={(v) => set({ heightM: v })} keyboardType="decimal-pad" />
        </View>
      </View>
      <Text style={st.label}>Piso</Text>
      <Chips options={catalog.floors} value={form.floor} onChange={(v) => set({ floor: v })} />
      <Field label="Color de pared (hexadecimal)" value={form.wallColor} onChangeText={(v) => set({ wallColor: v })} autoCapitalize="characters" placeholder="#F2EFE9" />

      <Text style={st.section}>Camas (máximo {catalog.maxBeds})</Text>
      <Text style={[st.muted, { fontSize: 12 }]}>X y Z son el centro de la cama, medidos desde la esquina de la habitación.</Text>
      {form.beds.map((b, i) => (
        <Card key={i}>
          <Chips options={catalog.beds.map((x) => x.type)} labels={bedLabels} value={b.type} onChange={(v) => setBed(i, { type: v })} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={st.flex}>
              <Field label="X (ancho)" value={b.x} onChangeText={(v) => setBed(i, { x: v })} keyboardType="decimal-pad" />
            </View>
            <View style={st.flex}>
              <Field label="Z (largo)" value={b.z} onChangeText={(v) => setBed(i, { z: v })} keyboardType="decimal-pad" />
            </View>
          </View>
          <Chips options={['0', '90']} labels={rotLabels} value={b.rot} onChange={(v) => setBed(i, { rot: v })} />
          {form.beds.length > 1 && <Button title="Quitar cama" small variant="danger" onPress={() => set({ beds: form.beds.filter((_, k) => k !== i) })} />}
        </Card>
      ))}
      {form.beds.length < catalog.maxBeds && (
        <Button title="Agregar cama" small variant="outline" onPress={() => set({ beds: [...form.beds, { type: catalog.beds[0]?.type ?? 'OnePlaza', x: '1', z: '1', rot: '0' }] })} />
      )}

      <Text style={st.section}>Puerta</Text>
      <Card>
        <Chips options={WALLS} labels={wallLabels} value={form.door.wall} onChange={(v) => set({ door: { ...form.door, wall: v } })} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={st.flex}>
            <Field label="Distancia desde la esquina" value={form.door.offset} onChangeText={(v) => set({ door: { ...form.door, offset: v } })} keyboardType="decimal-pad" />
          </View>
          <View style={st.flex}>
            <Field label="Ancho (0.7–1.2)" value={form.door.width} onChangeText={(v) => set({ door: { ...form.door, width: v } })} keyboardType="decimal-pad" />
          </View>
        </View>
      </Card>

      <Text style={st.section}>Ventanas (máximo {catalog.maxWindows})</Text>
      {form.windows.map((w, i) => (
        <Card key={i}>
          <Chips options={WALLS} labels={wallLabels} value={w.wall} onChange={(v) => setWindow(i, { wall: v })} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={st.flex}>
              <Field label="Distancia desde la esquina" value={w.offset} onChangeText={(v) => setWindow(i, { offset: v })} keyboardType="decimal-pad" />
            </View>
            <View style={st.flex}>
              <Field label="Ancho (0.4–3.0)" value={w.width} onChangeText={(v) => setWindow(i, { width: v })} keyboardType="decimal-pad" />
            </View>
          </View>
          <Button title="Quitar ventana" small variant="danger" onPress={() => set({ windows: form.windows.filter((_, k) => k !== i) })} />
        </Card>
      ))}
      {form.windows.length < catalog.maxWindows && (
        <Button title="Agregar ventana" small variant="outline" onPress={() => set({ windows: [...form.windows, { wall: 'N', offset: '0.5', width: '1' }] })} />
      )}

      {!complete && <Text style={st.muted}>Completa todos los campos numéricos.</Text>}
      {preview && preview.isValid && (
        <OkText message={`Diseño válido: ${preview.areaM2} m² · ${preview.guestCapacity} huésped(es) · ${preview.bedSummary}`} />
      )}
      {preview && !preview.isValid && <ErrorText message={preview.errors.join('\n')} />}
      <ErrorText message={act.error} />
      <OkText message={saved} />

      <View style={st.row}>
        <View style={st.flex}>
          <Button title="Validar" variant="outline" onPress={validate} loading={act.busy === 'validate'} disabled={!complete} />
        </View>
        <View style={st.flex}>
          <Button title="Guardar" onPress={save} loading={act.busy === 'save'} disabled={!complete} />
        </View>
      </View>
      {saved && !scene && <Button title="Ver en 3D" variant="outline" onPress={view3d} loading={act.busy === 'scene'} />}
      {scene && <SceneViewer scene={scene} onError={() => act.setError('No se pudo iniciar el visor 3D. Revisa tu conexión.')} />}
    </ScrollView>
  );
}
