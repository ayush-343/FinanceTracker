import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { format, parseISO, subDays, subMonths } from 'date-fns';
import { Card, Chip, Hatch, KButton, PillInput, Symbol, useKolam, hueMap, type, space, radii } from '../src/ui';
import { useCurrency, useDictation } from '../src/hooks';
import { useBudgetStore, useSettingsStore } from '../src/store';
import {
  createItem, deleteTransaction, getCategories, getItems, getSubcategories, getTransactionById, learnCategory, loadCategoryMemory, loadDrawnDays,
  loadKnownItems, markNothingSpent, updateTransaction,
} from '../src/database';
import { keywordCategory, suggestCategory, KnownItem, MemoryRow } from '../src/ai/categorizer';
import { preParse } from '../src/ai/quicklog/preParse';
import { parseQuickLog } from '../src/ai/quicklog/parse';
import { getEngine } from '../src/ai/engine';
import { detectDuplicate, detectUnusual } from '../src/ai/insights/detectors';
import { loadRecentTransactions, loadTransactionsSince } from '../src/ai/insights/load';
import { useReceiptScanner } from '../src/hooks/useReceiptScanner';
import { ScanningModal } from '../src/components/ScanningModal';
import { BarcodeScannerModal } from '../src/components/BarcodeScannerModal';
import { applyParse, Draft, emptyDraft, parseAmountInput, saveLabel, Touched } from '../src/log/draft';
import { Category, Subcategory, TransactionSource } from '../src/types';

type Params = {
  voice?: string; categoryId?: string; subcategoryId?: string; itemName?: string; amount?: string;
  notes?: string; date?: string; merchant?: string; source?: string; transactionId?: string;
};

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** One sheet for every way of logging: a sentence (typed or spoken) fills the card live; or fill it by hand. */
export default function LogSheet() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { c, isDark } = useKolam();
  const { format: money, symbol } = useCurrency();
  const { addTransaction } = useBudgetStore();
  const { aiEngine, localModelId, currency } = useSettingsStore();
  const dictation = useDictation();
  const scanner = useReceiptScanner();

  const todayISO = iso(new Date());
  const [sentence, setSentence] = React.useState('');
  const [draft, setDraft] = React.useState<Draft>(() => ({
    ...emptyDraft(params.date ?? todayISO),
    amount: params.amount ?? '',
    what: params.itemName ?? params.merchant ?? '',
    merchant: params.merchant ?? null,
    note: params.notes ?? '',
    categoryId: params.categoryId ? Number(params.categoryId) : null,
    subcategoryId: params.subcategoryId ? Number(params.subcategoryId) : null,
    categorySource: params.categoryId ? 'user' : null,
  }));
  const [touched, setTouched] = React.useState<Touched>(() => ({
    amount: !!params.amount, what: !!(params.itemName || params.merchant), date: !!params.date, category: !!params.categoryId,
  }));
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [subcategories, setSubcategories] = React.useState<Subcategory[]>([]);
  const [memory, setMemory] = React.useState<{ rows: MemoryRow[]; items: KnownItem[] }>({ rows: [], items: [] });
  const [drawn, setDrawn] = React.useState<Set<string>>(new Set());
  const [warning, setWarning] = React.useState<string | null>(null);
  const [usedMic, setUsedMic] = React.useState(params.voice === '1');
  const [refining, setRefining] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showPicker, setShowPicker] = React.useState(false);
  const autoStarted = React.useRef(false);
  const editingId = params.transactionId ? Number(params.transactionId) : null;
  const originalCategory = React.useRef<number | null>(null);
  const originalLabel = React.useRef('');

  // Edit mode: load the purchase into the card; every field counts as the user's own.
  React.useEffect(() => {
    if (!editingId) return;
    getTransactionById(editingId).then((t) => {
      if (!t) return;
      originalCategory.current = t.category_id;
      originalLabel.current = t.merchant || t.item_name || t.notes || '';
      setDraft({
        amount: String(t.amount), what: t.merchant || t.item_name || t.notes || '', merchant: t.merchant ?? null,
        date: t.date, categoryId: t.category_id, subcategoryId: t.subcategory_id, categorySource: 'user', note: t.item_name || t.merchant ? t.notes : '',
      });
      setTouched({ amount: true, what: true, date: true, category: true });
    }).catch((e) => console.warn('[Log] load purchase failed:', e));
  }, [editingId]);

  const hues = hueMap(categories.map((x) => x.id), isDark);
  const validIds = React.useMemo(() => new Set(categories.map((x) => x.id)), [categories]);

  React.useEffect(() => {
    Promise.all([getCategories(), loadCategoryMemory(), loadKnownItems(), loadDrawnDays(iso(subMonths(new Date(), 2)), todayISO)])
      .then(([cats, rows, items, days]) => { setCategories(cats); setMemory({ rows, items }); setDrawn(days); })
      .catch((e) => console.warn('[Log] load failed:', e));
  }, [todayISO]);

  React.useEffect(() => {
    if (!draft.categoryId) { setSubcategories([]); return; }
    getSubcategories(draft.categoryId).then(setSubcategories).catch(() => setSubcategories([]));
  }, [draft.categoryId]);

  // Opened from Today's mic: start listening as soon as dictation is available.
  React.useEffect(() => {
    if (params.voice === '1' && dictation.available && !autoStarted.current) {
      autoStarted.current = true;
      dictation.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.voice, dictation.available]);

  React.useEffect(() => { if (dictation.transcript) onSentence(dictation.transcript); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dictation.transcript]);

  /** Rule-based read on every change: instant, offline, never touches fields edited by hand. */
  const onSentence = (text: string) => {
    setSentence(text);
    if (!text.trim()) return;
    const pre = preParse(text, new Date());
    setDraft((d) => {
      let next = applyParse(d, { amount: pre.amount, item: pre.item, merchant: pre.merchant, date: pre.date }, touched);
      if (!touched.category) {
        const learned = suggestCategory(pre.merchant ?? pre.item ?? text, memory.rows, memory.items, validIds);
        const guessed = learned ? null : keywordCategory(text, categories);
        next = learned
          ? { ...next, categoryId: learned.categoryId, subcategoryId: learned.subcategoryId, categorySource: 'learned' }
          : guessed
            ? { ...next, categoryId: guessed, subcategoryId: null, categorySource: 'model' }
            : d.categorySource === 'learned' || d.categorySource === 'model' ? { ...next, categoryId: null, subcategoryId: null, categorySource: null } : next;
      }
      return next;
    });
  };

  /** On submit, let the on-device model refine the untouched fields. */
  const refine = async () => {
    if (!sentence.trim() || dictation.listening) return;
    setRefining(true);
    try {
      const engine = await getEngine(aiEngine, localModelId);
      if (!engine) return;
      const result = await parseQuickLog(sentence, { engine, today: new Date(), currency, categoryNames: categories.map((x) => x.name) });
      setDraft((d) => {
        let next = applyParse(d, { amount: result.amount, item: result.item, merchant: result.merchant, date: result.date }, touched);
        if (!touched.category && !next.categoryId && result.categoryHint) {
          const hinted = categories.find((x) => x.name.toLowerCase() === result.categoryHint!.toLowerCase());
          if (hinted) next = { ...next, categoryId: hinted.id, subcategoryId: null, categorySource: 'model' };
        }
        return next;
      });
    } catch (e) {
      console.warn('[Log] refine failed, keeping the rule-based read:', e);
    } finally {
      setRefining(false);
    }
  };

  const edit = <K extends keyof Draft>(key: K, value: Draft[K], mark?: keyof Touched) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (mark) setTouched((t) => ({ ...t, [mark]: true }));
  };

  const amount = parseAmountInput(draft.amount);

  // Non-blocking checks: likely duplicate, or much bigger than usual for this category.
  React.useEffect(() => {
    if (!amount) { setWarning(null); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const dup = detectDuplicate({ amount, label: draft.merchant || draft.what, now: new Date().toISOString() }, await loadRecentTransactions());
        if (cancelled) return;
        if (dup) {
          const mins = Math.max(1, Math.round((Date.now() - Date.parse(dup.createdAt)) / 60000));
          setWarning(`Looks like a duplicate of ${money(dup.amount)} ${dup.label} added ${mins} min ago.`);
          return;
        }
        const cat = categories.find((x) => x.id === draft.categoryId);
        if (cat) {
          const unusual = detectUnusual({ amount, categoryId: cat.id }, await loadTransactionsSince(90));
          if (cancelled) return;
          if (unusual) { setWarning(`Much bigger than your usual ${cat.name} purchase (${money(unusual.median)}).`); return; }
        }
        setWarning(null);
      } catch (e) {
        console.warn('[Log] checks failed:', e);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [amount, draft.what, draft.merchant, draft.categoryId, categories, money]);

  const missing = !amount ? 'Add an amount' : !draft.categoryId ? 'Pick a category' : null;

  const save = async () => {
    if (missing || !amount || !draft.categoryId) return;
    setSaving(true);
    try {
      const label = (draft.what || draft.merchant || '').trim();
      if (editingId) {
        await updateTransaction(editingId, {
          amount, date: draft.date, category_id: draft.categoryId, subcategory_id: draft.subcategoryId,
          notes: draft.merchant ? draft.note : label, merchant: draft.merchant ? label || draft.merchant : null,
          // A renamed purchase stops showing its old item's name.
          ...(label !== originalLabel.current ? { item_id: null } : {}),
        });
        if (label && originalCategory.current !== draft.categoryId) await learnCategory(label, draft.categoryId, draft.subcategoryId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        router.back();
        return;
      }
      let itemId: number | undefined;
      if (draft.subcategoryId && label) {
        const existing = (await getItems(draft.subcategoryId)).find((i) => i.name.trim().toLowerCase() === label.toLowerCase());
        itemId = existing?.id ?? await createItem({ subcategory_id: draft.subcategoryId, name: label, default_price: amount });
      }
      const source: TransactionSource =
        params.source === 'scan' ? 'scan' : usedMic ? 'voice' : sentence.trim() ? 'text' : 'manual';
      await addTransaction({
        category_id: draft.categoryId,
        subcategory_id: draft.subcategoryId ?? undefined,
        item_id: itemId,
        amount,
        date: draft.date,
        notes: draft.note.trim() || (itemId ? '' : label),
        merchant: draft.merchant,
        source,
      });
      if (label) await learnCategory(label, draft.categoryId, draft.subcategoryId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      console.warn('[Log] save failed:', e);
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!editingId) return;
    Alert.alert('Delete this purchase?', 'It will be removed from your history and totals. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(editingId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          router.back();
        },
      },
    ]);
  };

  const nothingToday = async () => {
    await markNothingSpent(todayISO);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  const yesterdayISO = iso(subDays(new Date(), 1));
  const showNothing = !editingId && !sentence.trim() && !draft.amount && !drawn.has(todayISO);
  const selectedCat = categories.find((x) => x.id === draft.categoryId);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.ground }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text maxFontSizeMultiplier={2} accessibilityRole="header" style={[type.title, { color: c.ink }]}>{editingId ? 'Edit purchase' : 'Log a spend'}</Text>
          <View style={styles.headerRight}>
            {editingId ? null : (
              <Pressable onPress={scanner.pickImage} accessibilityRole="button" accessibilityLabel="Scan a receipt" hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.surface }]}>
                <Symbol name="doc.text.viewfinder" fallback="camera" color={c.ink} />
              </Pressable>
            )}
            <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8} style={styles.cancel}>
              <Text maxFontSizeMultiplier={2} style={[type.body, { color: c.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxxl }}>
          {editingId ? null : (
          <View style={{ marginHorizontal: space.lg }}>
            <PillInput
              value={sentence}
              onChangeText={(t) => { setUsedMic(false); onSentence(t); }}
              onSubmitEditing={refine}
              onBlur={refine}
              autoFocus={params.voice !== '1' && !params.amount && !params.categoryId}
              placeholder="250 uber yesterday"
              returnKeyType="done"
              accessibilityLabel="Describe the purchase in one sentence"
              style={{ fontSize: 20, fontWeight: '600', minHeight: 60 }}
              action={dictation.available ? {
                label: dictation.listening ? 'Stop dictation' : 'Speak',
                onPress: () => { if (dictation.listening) { dictation.stop(); refine(); } else { setUsedMic(true); dictation.start(); } },
                icon: <Symbol name={dictation.listening ? 'stop.fill' : 'mic.fill'} fallback={dictation.listening ? 'square' : 'mic'} color={c.onAction} />,
              } : undefined}
            />
            <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.muted, marginTop: space.sm, marginLeft: space.xs }]}>
              {dictation.listening ? 'Listening… tap stop when you’re done.'
                : refining ? 'Reading on this phone…'
                : dictation.error ?? 'Read on this phone. You check everything before it saves.'}
            </Text>
          </View>
          )}

          <Card style={{ marginTop: editingId ? space.xs : space.lg }}>
            <View style={styles.amountRow}>
              <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.muted }]}>Amount</Text>
              <Text maxFontSizeMultiplier={1.3} style={[type.money(34, '700'), { color: draft.amount ? c.ink : c.muted, marginLeft: 'auto' }]}>{symbol}</Text>
              <TextInput
                value={draft.amount}
                onChangeText={(v) => edit('amount', v, 'amount')}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={c.muted}
                accessibilityLabel="Amount"
                style={[type.money(34, '700'), styles.amountInput, { color: c.ink }]}
              />
            </View>
            <View style={[styles.kv, { borderTopColor: c.hairline }]}>
              <Text maxFontSizeMultiplier={2} style={[type.body, { color: c.muted }]}>What</Text>
              <TextInput
                value={draft.what}
                onChangeText={(v) => edit('what', v, 'what')}
                placeholder="Coffee, Uber, rent…"
                placeholderTextColor={c.muted}
                accessibilityLabel="What was it"
                style={[type.body, styles.kvInput, { color: c.ink }]}
              />
            </View>
            <View style={[styles.kv, { borderTopColor: c.hairline }]}>
              <Text maxFontSizeMultiplier={2} style={[type.body, { color: c.muted }]}>When</Text>
              <View style={styles.chipsRight}>
                <Chip label="Today" selected={draft.date === todayISO} onPress={() => edit('date', todayISO, 'date')} />
                <Chip label="Yesterday" selected={draft.date === yesterdayISO} onPress={() => edit('date', yesterdayISO, 'date')} />
                <Chip
                  label={draft.date !== todayISO && draft.date !== yesterdayISO ? format(parseISO(draft.date), 'd MMM') : 'Other'}
                  selected={draft.date !== todayISO && draft.date !== yesterdayISO}
                  onPress={() => setShowPicker((s) => !s)}
                />
              </View>
            </View>
            {showPicker ? (
              <DateTimePicker
                value={parseISO(draft.date)}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={c.action}
                onChange={(_, d) => { if (d) edit('date', iso(d), 'date'); if (Platform.OS !== 'ios') setShowPicker(false); }}
              />
            ) : null}
            <View style={[styles.kvBlock, { borderTopColor: c.hairline }]}>
              <View style={styles.row}>
                <Text maxFontSizeMultiplier={2} style={[type.body, { color: c.muted }]}>Category</Text>
                {draft.categorySource === 'learned' || draft.categorySource === 'model' ? (
                  <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.muted }]}>{draft.categorySource === 'learned' ? 'learned from you' : 'suggested'}</Text>
                ) : null}
              </View>
              {categories.length === 0 ? (
                <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.muted, marginTop: space.sm }]}>Add a category in Plan to start logging.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                  {categories.map((cat) => (
                    <Chip
                      key={cat.id}
                      label={cat.name}
                      hue={hues.get(cat.id)}
                      selected={draft.categoryId === cat.id}
                      onPress={() => {
                        setDraft((d) => ({ ...d, categoryId: cat.id, subcategoryId: null, categorySource: 'user' }));
                        setTouched((t) => ({ ...t, category: true }));
                      }}
                    />
                  ))}
                </ScrollView>
              )}
              {selectedCat && subcategories.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                  {subcategories.map((sub) => (
                    <Chip key={sub.id} label={sub.name} selected={draft.subcategoryId === sub.id} onPress={() => edit('subcategoryId', draft.subcategoryId === sub.id ? null : sub.id, 'category')} />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          </Card>

          {warning ? (
            <View accessibilityRole="alert" style={[styles.warn, { backgroundColor: c.surface }]}>
              <Hatch width={18} height={18} color={c.hatchInk} radius={5} />
              <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.ink, flex: 1, marginLeft: space.md }]}>{warning}</Text>
            </View>
          ) : null}

          <View style={{ marginHorizontal: space.lg, marginTop: space.lg }}>
            <KButton
              title={missing ?? (editingId ? 'Save changes' : saveLabel(draft.date, todayISO, drawn))}
              onPress={save}
              disabled={!!missing}
              loading={saving}
            />
            {showNothing ? (
              <KButton title="Nothing spent today" variant="ghost" onPress={nothingToday} style={{ marginTop: space.sm }} accessibilityHint="Draws today's loop without adding a purchase" />
            ) : null}
            {editingId ? <KButton title="Delete purchase" variant="ghost" onPress={confirmDelete} style={{ marginTop: space.sm }} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ScanningModal
        visible={scanner.showModal}
        isLoading={scanner.isScanning}
        error={scanner.error}
        onRetry={scanner.retry}
        onManualEntry={scanner.goToManualEntry}
        onClose={scanner.closeModal}
      />
      <BarcodeScannerModal visible={scanner.showBarcodeScanner} onClose={scanner.closeBarcodeScanner} onScanComplete={scanner.handleBarcodeScanComplete} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: space.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 },
  amountInput: { minWidth: 40, textAlign: 'right', marginLeft: space.xs, paddingVertical: 0 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderTopWidth: StyleSheet.hairlineWidth },
  kvInput: { flex: 1, textAlign: 'right', marginLeft: space.lg, minHeight: 44 },
  kvBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, paddingBottom: space.xs },
  chipsRight: { flexDirection: 'row', gap: space.xs + 2 },
  chipScroll: { gap: space.sm, paddingTop: space.md, paddingBottom: space.xs },
  warn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, marginTop: space.md, padding: space.md, borderRadius: radii.small + 2 },
});
