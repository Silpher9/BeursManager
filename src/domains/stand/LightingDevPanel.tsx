import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useStandEditor } from './StandEditorContext';

const PANEL_BG = '#3A2E22';
const ACTIVE_TINT = '#FFFDF9';
const INACTIVE_TINT = '#D8C5AB';
const ACCENT = '#8A6A45';

function NumRow({ label, value, onSubmit, step = 0.1 }: { label: string; value: number; onSubmit: (v: number) => void; step?: number }) {
  return (
    <View style={styles.numRow}>
      <Text style={styles.numLabel}>{label}</Text>
      <Pressable style={styles.stepButton} onPress={() => onSubmit(Math.max(0, +(value - step).toFixed(4)))}>
        <Text style={styles.stepText}>-</Text>
      </Pressable>
      <TextInput
        key={value.toFixed(4)}
        style={styles.numInput}
        keyboardType="numeric"
        defaultValue={value.toFixed(2)}
        onEndEditing={(e) => { const n = parseFloat(e.nativeEvent.text); if (!isNaN(n)) onSubmit(n); }}
      />
      <Pressable style={styles.stepButton} onPress={() => onSubmit(+(value + step).toFixed(4))}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

const DEFAULTS = { intensity: 2.0, angle: 0.79, exponent: 2, range: 10 };

const COLOR_PRESETS = [
  { name: 'Warm', r: 1, g: 0.85, b: 0.7 },
  { name: 'Neutraal', r: 1, g: 0.97, b: 0.92 },
  { name: 'Koud', r: 0.85, g: 0.92, b: 1 },
];

/** Hydrated from scene runtime state via key-based remount */
function LampControls({ lampId, initial }: {
  lampId: string;
  initial: { intensity: number; angle: number; exponent: number; range: number; helperVisible: boolean };
}) {
  const { sendMessage } = useStandEditor();
  const [intensity, setIntensity] = useState(initial.intensity);
  const [angle, setAngle] = useState(initial.angle);
  const [exponent, setExponent] = useState(initial.exponent);
  const [range, setRange] = useState(initial.range);
  const [helperVisible, setHelperVisible] = useState(initial.helperVisible);

  const updateProp = (prop: string, value: number) => {
    sendMessage({ type: 'setLampProperty', lampId, property: prop, value });
  };

  const CLAMPS: Record<string, [number, number]> = {
    intensity: [0, 5],
    angle: [0.1, Math.PI / 2 - 0.05],
    exponent: [0.1, 10],
    range: [0.5, 50],
  };

  const setVal = (setter: (v: number) => void, prop: string) => (v: number) => {
    const clamp = CLAMPS[prop];
    const clamped = clamp ? Math.max(clamp[0], Math.min(clamp[1], v)) : v;
    setter(clamped);
    updateProp(prop, clamped);
  };

  const applyColor = (r: number, g: number, b: number) => {
    sendMessage({ type: 'setLampProperty', lampId, property: 'diffuseR', value: r });
    sendMessage({ type: 'setLampProperty', lampId, property: 'diffuseG', value: g });
    sendMessage({ type: 'setLampProperty', lampId, property: 'diffuseB', value: b });
  };

  const reset = () => {
    setIntensity(DEFAULTS.intensity); updateProp('intensity', DEFAULTS.intensity);
    setAngle(DEFAULTS.angle); updateProp('angle', DEFAULTS.angle);
    setExponent(DEFAULTS.exponent); updateProp('exponent', DEFAULTS.exponent);
    setRange(DEFAULTS.range); updateProp('range', DEFAULTS.range);
    applyColor(1, 0.97, 0.92);
    setHelperVisible(false);
    sendMessage({ type: 'toggleLampHelper', lampId, visible: false });
  };

  const toggleHelper = (v: boolean) => {
    setHelperVisible(v);
    sendMessage({ type: 'toggleLampHelper', lampId, visible: v });
  };

  return (
    <>
      <Text style={styles.sectionLabel}>Geselecteerde lamp</Text>
      <NumRow label="Intensity" value={intensity} step={0.2} onSubmit={setVal(setIntensity, 'intensity')} />
      <NumRow label="Angle" value={angle} step={0.05} onSubmit={setVal(setAngle, 'angle')} />
      <NumRow label="Exponent" value={exponent} step={0.5} onSubmit={setVal(setExponent, 'exponent')} />
      <NumRow label="Range" value={range} step={1} onSubmit={setVal(setRange, 'range')} />

      <Text style={styles.sectionLabel}>Kleur</Text>
      <View style={styles.presetRow}>
        {COLOR_PRESETS.map(p => (
          <Pressable key={p.name} style={styles.presetButton} onPress={() => applyColor(p.r, p.g, p.b)}>
            <View style={[styles.presetSwatch, { backgroundColor: `rgb(${Math.round(p.r * 255)},${Math.round(p.g * 255)},${Math.round(p.b * 255)})` }]} />
            <Text style={styles.presetText}>{p.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Debug</Text>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Cone helper</Text>
        <Switch value={helperVisible} onValueChange={toggleHelper} trackColor={{ true: ACCENT }} />
      </View>

      <Pressable style={styles.resetButton} onPress={reset}>
        <Text style={styles.resetText}>Reset defaults</Text>
      </Pressable>
    </>
  );
}

export function LightingDevPanel() {
  const { selectedLampId, lampRuntimeState } = useStandEditor();

  return (
    <View style={styles.panel}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Lighting Dev Tools</Text>
        {selectedLampId && lampRuntimeState ? (
          <LampControls
            key={selectedLampId}
            lampId={selectedLampId}
            initial={lampRuntimeState}
          />
        ) : (
          <Text style={styles.hintText}>Selecteer een lamp om instellingen te tunen</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: PANEL_BG, borderRadius: 20, padding: 14, height: 280, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  title: { color: ACTIVE_TINT, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  sectionLabel: { color: INACTIVE_TINT, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  numLabel: { color: INACTIVE_TINT, fontSize: 11, width: 60 },
  stepButton: { backgroundColor: 'rgba(255,253,249,0.1)', width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: ACTIVE_TINT, fontSize: 16, fontWeight: '700' },
  numInput: { backgroundColor: 'rgba(255,253,249,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, width: 60, fontSize: 12, color: ACTIVE_TINT, textAlign: 'center' },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  presetButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,253,249,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  presetSwatch: { width: 14, height: 14, borderRadius: 7 },
  presetText: { color: INACTIVE_TINT, fontSize: 11 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  toggleLabel: { color: INACTIVE_TINT, fontSize: 12 },
  resetButton: { backgroundColor: 'rgba(255,253,249,0.08)', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  resetText: { color: INACTIVE_TINT, fontSize: 12, fontWeight: '600' },
  hintText: { color: 'rgba(255,253,249,0.3)', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 40 },
});
