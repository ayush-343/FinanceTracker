import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { getLocales } from 'expo-localization';
import { format } from 'date-fns';
import { Kolam, KButton, Chip, PillInput, Money, Symbol, useKolam, CATEGORY_HUES, type, space, radii } from '../../src/ui';
import { useBudgetStore, useSettingsStore } from '../../src/store';
import { CURRENCIES } from '../../src/constants';
import { learnCategory, markNothingSpent } from '../../src/database';
import { buildMonthKolam } from '../../src/today/kolamGrid';
import { preParse } from '../../src/ai/quicklog/preParse';
import { parseAmountInput } from '../../src/log/draft';
import { STARTERS, starterSplit } from '../../src/onboarding/starter';
import { useCurrency } from '../../src/hooks';

type Step = 'welcome' | 'currency' | 'budget' | 'first';
const STEPS: Step[] = ['welcome', 'currency', 'budget', 'first'];

const defaultCurrency = () => {
  const code = getLocales()[0]?.currencyCode;
  return CURRENCIES.some((x) => x.code === code) ? code! : 'INR';
};

/** Three steps to a working app: currency, a budget with starter categories, then draw day one of the kolam. */
export default function Start() {
  const { c } = useKolam();
  const insets = useSafeAreaInsets();
  const { formatWhole } = useCurrency();
  const { setCurrency, setOnboardingCompleted } = useSettingsStore();
  const { addCategory, addTransaction } = useBudgetStore();

  const [step, setStep] = React.useState<Step>('welcome');
  const [code, setCode] = React.useState(defaultCurrency);
  const [budget, setBudget] = React.useState('');
  const [chosen, setChosen] = React.useState<string[]>(STARTERS.map((s) => s.key));
  const [created, setCreated] = React.useState<{ id: number; name: string; color: string }[]>([]);
  const [sentence, setSentence] = React.useState('');
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [drawnToday, setDrawnToday] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [kolamWidth, setKolamWidth] = React.useState(0);

  const now = new Date();
  const todayISO = format(now, 'yyyy-MM-dd');
  const kolam = buildMonthKolam(now.getFullYear(), now.getMonth(), drawnToday ? new Set([todayISO]) : new Set(), todayISO);
  const split = starterSplit(parseAmountInput(budget) ?? 0, chosen);
  const pre = sentence.trim() ? preParse(sentence, now) : null;
  const amount = pre?.amount ?? null;
  const next = (s: Step) => { Haptics.selectionAsync().catch(() => {}); setStep(s); };
  const onKolamLayout = (e: LayoutChangeEvent) => setKolamWidth(e.nativeEvent.layout.width);

  const saveCurrency = async () => { await setCurrency(code); next('budget'); };

  const saveBudget = async () => {
    setBusy(true);
    try {
      const made: { id: number; name: string; color: string }[] = [];
      for (const s of STARTERS) {
        if (!chosen.includes(s.key)) continue;
        const color = CATEGORY_HUES[made.length % CATEGORY_HUES.length];
        const id = await addCategory({ name: s.name, icon_name: s.icon, color, budget_limit: split.find((x) => x.key === s.key)?.amount ?? 0 });
        made.push({ id, name: s.name, color });
      }
      setCreated(made);
      next('first');
    } finally {
      setBusy(false);
    }
  };

  const drawDay = async (what: () => Promise<void>) => {
    setBusy(true);
    try {
      await what();
      setDrawnToday(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const saveFirst = () => drawDay(async () => {
    if (!amount || !categoryId) return;
    const label = (pre?.merchant || pre?.item || sentence).trim();
    await addTransaction({ category_id: categoryId, amount, date: pre?.date ?? todayISO, notes: label, merchant: pre?.merchant ?? null, source: 'text' });
    if (label) await learnCategory(label, categoryId, null);
  });

  const index = STEPS.indexOf(step);
  const dots = (
    <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
      {STEPS.map((s, i) => <View key={s} style={[styles.dot, { backgroundColor: i <= index ? (step === 'welcome' ? c.fieldInk : c.ink) : (step === 'welcome' ? c.fieldLine : c.hairline) }]} />)}
    </View>
  );

  if (step === 'welcome') {
    return (
      <View style={[styles.root, { backgroundColor: c.field, paddingTop: Math.max(insets.top, 54), paddingBottom: Math.max(insets.bottom, 20) }]}>
        <StatusBar style="light" />
        {dots}
        <View style={styles.pad}>
          <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={[styles.hero, { color: c.fieldInk }]}>Your month,{'\n'}one loop a day.</Text>
          <View onLayout={onKolamLayout} style={{ marginTop: space.xxl }}>
            <Kolam cells={kolam.cells} rows={kolam.rows} width={kolamWidth} accessibilityLabel={`${format(now, 'MMMM')}, nothing logged yet`} />
          </View>
          <Text maxFontSizeMultiplier={2} style={[styles.lede, { color: c.fieldMuted }]}>
            Log what you spend and today's loop closes. Miss a day and it stays a dot; the pattern keeps going. Everything stays on this phone.
          </Text>
        </View>
        <View style={styles.footer}><KButton title="Start" onPress={() => next('currency')} /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: c.ground }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 54), paddingBottom: Math.max(insets.bottom, 20) }]}>
        <StatusBar style="auto" />
        {dots}

        {step === 'currency' ? (
          <>
            <View style={styles.pad}>
              <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={[type.largeTitle, { color: c.ink }]}>Which currency?</Text>
              <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: space.xs }]}>You can change it later in You.</Text>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {CURRENCIES.map((x) => (
                <Pressable key={x.code} onPress={() => setCode(x.code)} accessibilityRole="radio" accessibilityState={{ selected: code === x.code }}
                  style={[styles.option, { backgroundColor: code === x.code ? c.surface : 'transparent', borderColor: code === x.code ? c.ink : c.hairline }]}>
                  <Text maxFontSizeMultiplier={2} style={[type.money(18, '700'), { color: c.ink, width: 36 }]}>{x.symbol}</Text>
                  <Text maxFontSizeMultiplier={2} style={[type.body, { color: c.ink, flex: 1 }]}>{x.name}</Text>
                  {code === x.code ? <Symbol name="checkmark" fallback="check" color={c.ink} size={17} /> : null}
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.footer}><KButton title="Continue" onPress={saveCurrency} /></View>
          </>
        ) : null}

        {step === 'budget' ? (
          <>
            <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
              <View style={styles.pad}>
                <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={[type.largeTitle, { color: c.ink }]}>A month's budget</Text>
                <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: space.xs }]}>A rough number is fine. Today will show what's left each day.</Text>
                <TextInput
                  value={budget}
                  onChangeText={setBudget}
                  placeholder="30,000"
                  placeholderTextColor={c.muted}
                  keyboardType="number-pad"
                  accessibilityLabel="Monthly budget"
                  style={[type.money(40, '700'), styles.budget, { color: c.ink, borderBottomColor: c.hairline }]}
                />
                <Text maxFontSizeMultiplier={2} style={[type.label, { color: c.muted, marginTop: space.xl }]}>Start with these categories</Text>
                <View style={styles.chips}>
                  {STARTERS.map((s, i) => (
                    <Chip key={s.key} label={s.name} hue={CATEGORY_HUES[i]} selected={chosen.includes(s.key)}
                      onPress={() => setChosen((cur) => (cur.includes(s.key) ? cur.filter((k) => k !== s.key) : [...cur, s.key]))} />
                  ))}
                </View>
                {parseAmountInput(budget) && split.length ? (
                  <View style={[styles.split, { backgroundColor: c.surface }]}>
                    {split.map((x, i) => (
                      <View key={x.key} style={[styles.splitRow, { borderBottomColor: c.hairline, borderBottomWidth: i === split.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
                        <Text maxFontSizeMultiplier={2} style={[type.body, { color: c.ink, flex: 1 }]}>{STARTERS.find((s) => s.key === x.key)?.name}</Text>
                        <Money value={x.amount} size={15} whole />
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.muted, marginTop: space.md }]}>A suggested split. Change any of it later in Plan.</Text>
              </View>
            </ScrollView>
            <View style={styles.footer}>
              <KButton title={chosen.length ? 'Continue' : 'Pick at least one category'} onPress={saveBudget} disabled={!chosen.length} loading={busy} />
            </View>
          </>
        ) : null}

        {step === 'first' ? (
          <>
            <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
              <View style={styles.pad}>
                <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={[type.largeTitle, { color: c.ink }]}>{drawnToday ? 'Day one is drawn.' : 'Draw day one'}</Text>
                <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: space.xs }]}>
                  {drawnToday ? 'Come back tomorrow for the next loop.' : 'What did you spend today? One sentence is enough.'}
                </Text>
              </View>
              <View style={[styles.fieldBox, { backgroundColor: c.field }]} onLayout={(e) => setKolamWidth(e.nativeEvent.layout.width - space.lg * 2)}>
                <Text maxFontSizeMultiplier={2} style={[type.title, { color: c.fieldInk, marginBottom: space.md }]}>{format(now, 'MMMM')}</Text>
                <Kolam cells={kolam.cells} rows={kolam.rows} width={kolamWidth} accessibilityLabel={drawnToday ? 'Today is drawn' : "Today's loop is open"} />
              </View>
              {!drawnToday ? (
                <View style={styles.pad}>
                  <PillInput value={sentence} onChangeText={setSentence} placeholder="180 coffee at Blue Tokai" accessibilityLabel="Your first purchase" style={{ marginTop: space.lg }} />
                  {amount ? <Text maxFontSizeMultiplier={2} style={[type.money(15, '600'), { color: c.ink, marginTop: space.sm, marginLeft: space.xs }]}>{formatWhole(amount)}{pre?.item || pre?.merchant ? ` · ${pre?.merchant || pre?.item}` : ''}</Text> : null}
                  <View style={styles.chips}>
                    {created.map((x) => <Chip key={x.id} label={x.name} hue={x.color} selected={categoryId === x.id} onPress={() => setCategoryId(x.id)} />)}
                  </View>
                </View>
              ) : null}
            </ScrollView>
            <View style={styles.footer}>
              {drawnToday ? (
                <KButton title="Open Today" onPress={() => setOnboardingCompleted(true)} />
              ) : (
                <>
                  <KButton title={!amount ? 'Add an amount' : !categoryId ? 'Pick a category' : "Save · closes today's loop"} onPress={saveFirst} disabled={!amount || !categoryId} loading={busy} />
                  <KButton title="Nothing spent today" variant="ghost" onPress={() => drawDay(() => markNothingSpent(todayISO))} style={{ marginTop: space.sm }} />
                </>
              )}
            </View>
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { paddingHorizontal: space.xxl },
  dots: { flexDirection: 'row', gap: 6, paddingHorizontal: space.xxl, marginBottom: space.xxl },
  dot: { flex: 1, height: 3, borderRadius: 2 },
  hero: { fontSize: 40, fontWeight: '700', letterSpacing: -1.2, lineHeight: 44, marginTop: space.lg },
  lede: { fontSize: 17, lineHeight: 25, marginTop: space.xxl },
  footer: { paddingHorizontal: space.xxl, marginTop: 'auto', paddingTop: space.md },
  list: { paddingHorizontal: space.xxl, paddingTop: space.lg, gap: space.sm },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space.lg, borderRadius: radii.small + 2, borderWidth: 1 },
  budget: { marginTop: space.xl, borderBottomWidth: 1.5, paddingBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  split: { marginTop: space.lg, borderRadius: radii.card, paddingHorizontal: space.lg },
  splitRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  fieldBox: { marginHorizontal: space.lg, marginTop: space.xl, borderRadius: radii.field, padding: space.lg },
});
