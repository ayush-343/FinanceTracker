import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Screen, Field, Card, ListRow, Chip, Bands, Hatch, PillInput, KButton, Money, Symbol,
  useKolam, CATEGORY_HUES, type, space,
} from '../src/ui';

/** Development-only gallery of the Daily Kolam components. Not reachable in production builds. */
export default function DevKit() {
  const { c } = useKolam();
  const [text, setText] = React.useState('');
  const [chip, setChip] = React.useState('All');
  if (!__DEV__) return null;

  const spend = [
    { key: 'food', value: 10800, color: CATEGORY_HUES[0] },
    { key: 'transport', value: 4000, color: CATEGORY_HUES[1] },
    { key: 'groceries', value: 2600, color: CATEGORY_HUES[2] },
    { key: 'subs', value: 600, color: CATEGORY_HUES[4] },
  ];

  return (
    <Screen title="Kit" subtitle="Daily Kolam components" bottomInset={60}>
      <Field>
        <Text style={[type.title, { color: c.fieldInk }]}>November</Text>
        <Money value={44100} size={40} weight="700" whole color={c.fieldInk} style={{ marginTop: space.sm }} />
        <Text style={[type.sub, { color: c.fieldMuted, marginTop: 4 }]}>likely, of your ₹45,000 budget</Text>
        <View style={{ marginTop: space.lg }}>
          <Bands onField values={[{ key: 'spent', value: 28420, color: c.fieldInk }]} total={45000} hatch={{ from: 28420 / 45000, to: 0.98 }} marker={0.98} accessibilityLabel="Spent 63 percent, likely 98 percent of budget" />
        </View>
      </Field>

      <Card title="Left today">
        <Money value={1180} size={40} weight="700" whole />
        <Text style={[type.sub, { color: c.muted, marginTop: 6 }]}>to stay on pace for ₹45,000</Text>
        <View style={{ marginTop: space.lg }}>
          <Bands values={spend} total={45000} marker={0.9} accessibilityLabel="Spending by category against budget" />
        </View>
      </Card>

      <Card title="Over budget">
        <View style={styles.row}>
          <Hatch width={18} height={18} color={c.hatchInk} radius={5} />
          <Text style={[type.sub, { color: c.ink, marginLeft: space.sm }]}>Food is ₹800 over · pause delivery this week?</Text>
        </View>
      </Card>

      <Card title="Feed">
        <ListRow title="Blue Tokai" subtitle="Food · coffee" hue={CATEGORY_HUES[0]} amount={180} onPress={() => {}} />
        <ListRow title="Uber" subtitle="Transport · voice" hue={CATEGORY_HUES[1]} amount={250} onPress={() => {}} />
        <ListRow title="DMart" subtitle="Groceries · scanned" hue={CATEGORY_HUES[2]} amount={1200} last />
      </Card>

      <View style={[styles.chips, { marginTop: space.md }]}>
        {['All', 'Food 38%', 'Transport 24%'].map((l, i) => (
          <Chip key={l} label={l} selected={chip === l} hue={i ? CATEGORY_HUES[i - 1] : undefined} onPress={() => setChip(l)} />
        ))}
      </View>

      <View style={{ marginHorizontal: space.lg, marginTop: space.lg }}>
        <PillInput
          value={text}
          onChangeText={setText}
          placeholder="200 coffee at Blue Tokai…"
          accessibilityLabel="Describe a purchase"
          action={{ label: 'Speak', onPress: () => {}, icon: <Symbol name="mic.fill" fallback="mic" color={c.onAction} /> }}
        />
        <KButton title="Save · closes Friday's loop" onPress={() => {}} style={{ marginTop: space.lg }} />
        <KButton title="Nothing spent today" variant="ghost" onPress={() => {}} style={{ marginTop: space.sm }} />
        <KButton title="Saving" loading onPress={() => {}} style={{ marginTop: space.sm }} />
      </View>

      <View style={[styles.swatches, { marginTop: space.xl }]}>
        {[c.field, c.action, c.data, ...CATEGORY_HUES].map((col, i) => (
          <View key={`${col}-${i}`} style={[styles.swatch, { backgroundColor: col, borderColor: c.hairline }]} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginHorizontal: space.lg },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginHorizontal: space.lg },
  swatch: { width: 36, height: 36, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
});
