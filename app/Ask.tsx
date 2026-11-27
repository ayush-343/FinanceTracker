import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Chip, PillInput, Symbol, useKolam, hueMap, type, space } from '../src/ui';
import { AskResultCard } from '../src/components/AskResultCard';
import { useCurrency, useHaptics } from '../src/hooks';
import { useSettingsStore } from '../src/store';
import { getCategories } from '../src/database';
import { getEngine } from '../src/ai/engine';
import { askQuestion, AskAnswer } from '../src/ai/ask/ask';
import { askDb } from '../src/ai/ask/db';
import { Category } from '../src/types';

const STARTERS = [
  'How much did I spend this month?',
  'Biggest categories last month',
  'This month vs last month',
  'Largest purchases this week',
  'Will I go over budget?',
];

interface Exchange { id: number; question: string; answer?: AskAnswer }

/** Ask about your spending. The model only plans the query; every figure is computed from your data. */
export function AskView({ asTab = false, initialQuestion }: { asTab?: boolean; initialQuestion?: string }) {
  const router = useRouter();
  const { c, isDark } = useKolam();
  const { format: money } = useCurrency();
  const { light } = useHaptics();
  const { aiEngine, localModelId, budgetPeriod } = useSettingsStore();
  const [input, setInput] = useState('');
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => { getCategories().then(setCategories).catch(() => {}); }, []);
  const hues = hueMap(categories.map((x) => x.id), isDark);
  const hueOf = (name: string) => {
    const cat = categories.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return cat ? hues.get(cat.id) : undefined;
  };

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    light();
    setInput('');
    const id = Date.now();
    setExchanges((prev) => [...prev, { id, question: q }]);
    setBusy(true);
    try {
      const engine = await getEngine(aiEngine, localModelId);
      const off = 'On-device AI is off. Turn it on in You → On-Device AI.';
      const answer: AskAnswer = engine
        ? await askQuestion(q, {
          engine, db: askDb, today: new Date(), budgetPeriod, formatMoney: money,
          categories: categories.map((x) => ({ id: x.id, name: x.name })),
        })
        : { result: { kind: 'unsupported', reason: off }, sentence: off };
      setExchanges((prev) => prev.map((e) => (e.id === id ? { ...e, answer } : e)));
    } catch (error) {
      console.warn('[Ask] failed:', error);
      const sentence = 'Something went wrong. Please try again.';
      setExchanges((prev) => prev.map((e) => (e.id === id ? { ...e, answer: { result: { kind: 'unsupported', reason: sentence }, sentence } } : e)));
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  // Asked from Activity search: ask it once when it arrives.
  const lastAsked = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (initialQuestion && initialQuestion !== lastAsked.current) {
      lastAsked.current = initialQuestion;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const openActivity = (answer: AskAnswer, categoryName?: string) => {
    const cat = categoryName ? categories.find((x) => x.name.toLowerCase() === categoryName.toLowerCase()) : undefined;
    router.push({
      pathname: '/(tabs)/Activity',
      params: {
        ...(answer.range ? { month: format(parseISO(answer.range.from), 'yyyy-MM') } : {}),
        ...(cat ? { categoryId: String(cat.id) } : {}),
      },
    });
  };

  return (
    <SafeAreaView edges={asTab ? ['top'] : ['top', 'bottom']} style={[styles.root, { backgroundColor: c.ground }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={[type.largeTitle, { color: c.ink }]}>Ask</Text>
            <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: 2 }]}>Answers worked out from your data, on this phone</Text>
          </View>
          {asTab ? null : (
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={styles.close}>
              <Symbol name="xmark" fallback="x" color={c.ink} />
            </Pressable>
          )}
        </View>

        <ScrollView ref={scroller} style={styles.root} contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
          {exchanges.length === 0 ? (
            <View style={styles.starters}>
              {STARTERS.map((s) => <Chip key={s} label={s} onPress={() => ask(s)} />)}
            </View>
          ) : null}

          {exchanges.map((e) => (
            <View key={e.id} style={{ marginBottom: space.xl }}>
              <View style={[styles.bubble, { backgroundColor: c.field }]}>
                <Text maxFontSizeMultiplier={2} style={[type.body, { color: c.fieldInk }]}>{e.question}</Text>
              </View>
              {e.answer ? (
                <AskResultCard
                  result={e.answer.result}
                  sentence={e.answer.sentence}
                  hueOf={hueOf}
                  onOpenCategory={(name) => openActivity(e.answer!, name)}
                  onOpenMonth={() => openActivity(e.answer!)}
                  onOpenPurchase={(id) => router.push({ pathname: '/Log', params: { transactionId: String(id) } })}
                />
              ) : (
                <View style={styles.thinking}>
                  <ActivityIndicator color={c.muted} />
                  <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.muted, marginLeft: space.sm }]}>Working it out…</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={[styles.inputBar, { borderTopColor: c.hairline }]}>
          <PillInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => ask(input)}
            placeholder="Ask about your spending…"
            returnKeyType="send"
            editable={!busy}
            accessibilityLabel="Your question"
            action={{
              label: 'Send question',
              onPress: () => ask(input),
              disabled: busy || !input.trim(),
              icon: <Symbol name="arrow.up" fallback="arrow-up" color={busy || !input.trim() ? c.muted : c.onAction} />,
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AskScreen() {
  return <AskView />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  bubble: { alignSelf: 'flex-end', maxWidth: '85%', paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: 20, borderBottomRightRadius: 6, marginBottom: space.sm },
  thinking: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  inputBar: { paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth },
});
