import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { addMonths, format, parseISO } from 'date-fns';
import { Card, Chip, Bands, KButton, useKolam, type, space } from '../src/ui';
import { useCurrency } from '../src/hooks';
import { addToGoal, createGoal, deleteGoal, getGoal, updateGoal } from '../src/database';
import { parseAmountInput } from '../src/log/draft';
import { goalPlan } from '../src/plan/goals';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Create or edit a savings goal; in edit mode, add money towards it. */
export default function GoalSheet() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId?: string }>();
  const id = goalId ? Number(goalId) : null;
  const { c, isDark } = useKolam();
  const { formatWhole } = useCurrency();

  const [name, setName] = React.useState('');
  const [target, setTarget] = React.useState('');
  const [saved, setSaved] = React.useState('');
  const [date, setDate] = React.useState<string | null>(null);
  const [showPicker, setShowPicker] = React.useState(false);
  const [add, setAdd] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    getGoal(id).then((g) => {
      if (!g) return;
      setName(g.name);
      setTarget(String(g.target));
      setSaved(String(g.saved));
      setDate(g.target_date);
    }).catch((e) => console.warn('[Goal] load failed:', e));
  }, [id]);

  const targetN = parseAmountInput(target);
  const savedN = parseAmountInput(saved) ?? 0;
  const addN = parseAmountInput(add);
  const todayISO = iso(new Date());
  const plan = targetN ? goalPlan({ target: targetN, saved: savedN, target_date: date }, todayISO, formatWhole) : null;
  const missing = !name.trim() ? 'Name your goal' : !targetN ? 'Add a target amount' : null;

  const save = async () => {
    if (missing || !targetN) return;
    setBusy(true);
    try {
      const g = { name: name.trim(), target: targetN, saved: savedN, target_date: date };
      if (id) await updateGoal(id, g); else await createGoal(g);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const addMoney = async () => {
    if (!id || !addN) return;
    await addToGoal(id, addN);
    setSaved(String(Math.round((savedN + addN) * 100) / 100));
    setAdd('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const remove = () => {
    if (!id) return;
    Alert.alert(`Delete “${name}”?`, 'The goal and its progress will be removed. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGoal(id); router.back(); } },
    ]);
  };

  const field = (label: string, value: string, onChange: (v: string) => void, opts: { placeholder: string; money?: boolean; first?: boolean }) => (
    <View style={[styles.kv, { borderTopColor: c.hairline, borderTopWidth: opts.first ? 0 : StyleSheet.hairlineWidth }]}>
      <Text style={[type.body, { color: c.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={opts.placeholder}
        placeholderTextColor={c.muted}
        keyboardType={opts.money ? 'decimal-pad' : 'default'}
        accessibilityLabel={label}
        style={[opts.money ? type.money(17, '600') : type.body, styles.input, { color: c.ink }]}
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.ground }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[type.title, { color: c.ink }]}>{id ? 'Goal' : 'New goal'}</Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8} style={styles.cancel}>
            <Text style={[type.body, { color: c.muted }]}>Cancel</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.xxxl }}>
          {plan ? (
            <Card style={{ marginTop: 0 }}>
              <Text style={[type.title, { color: c.ink }]}>{name.trim() || 'Your goal'}</Text>
              <View style={{ marginTop: space.md }}>
                <Bands values={[{ key: 'saved', value: savedN, color: c.action }]} total={targetN ?? 1} accessibilityLabel={`${Math.round(plan.progress * 100)} percent saved`} />
              </View>
              <Text style={[type.sub, { color: c.muted, marginTop: space.sm }]}>{formatWhole(savedN)} of {formatWhole(targetN ?? 0)} · {plan.line}</Text>
            </Card>
          ) : null}

          <Card>
            {field('Name', name, setName, { placeholder: 'Goa trip, new laptop…', first: true })}
            {field('Target', target, setTarget, { placeholder: '0', money: true })}
            {field('Saved so far', saved, setSaved, { placeholder: '0', money: true })}
            <View style={[styles.kv, { borderTopColor: c.hairline, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[type.body, { color: c.muted }]}>By</Text>
              <View style={styles.chips}>
                <Chip label="No date" selected={!date} onPress={() => { setDate(null); setShowPicker(false); }} />
                <Chip
                  label={date ? format(parseISO(date), 'd MMM yyyy') : 'Pick a date'}
                  selected={!!date}
                  onPress={() => { if (!date) setDate(iso(addMonths(new Date(), 3))); setShowPicker((s) => !s); }}
                />
              </View>
            </View>
            {showPicker && date ? (
              <DateTimePicker
                value={parseISO(date)}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={c.action}
                onChange={(_, d) => { if (d) setDate(iso(d)); if (Platform.OS !== 'ios') setShowPicker(false); }}
              />
            ) : null}
          </Card>

          {id ? (
            <Card title="Add money">
              <View style={styles.addRow}>
                <TextInput
                  value={add}
                  onChangeText={setAdd}
                  placeholder="Amount you set aside"
                  placeholderTextColor={c.muted}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Amount to add to this goal"
                  style={[type.money(17, '600'), styles.addInput, { color: c.ink, borderColor: c.hairline }]}
                />
                <KButton title="Add" onPress={addMoney} disabled={!addN} style={{ height: 48, paddingHorizontal: space.xl }} />
              </View>
            </Card>
          ) : null}

          <View style={{ marginHorizontal: space.lg, marginTop: space.lg }}>
            <KButton title={missing ?? (id ? 'Save changes' : 'Create goal')} onPress={save} disabled={!!missing} loading={busy} />
            {id ? <KButton title="Delete goal" variant="ghost" onPress={remove} style={{ marginTop: space.sm }} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingVertical: space.md },
  cancel: { minHeight: 44, justifyContent: 'center' },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  input: { flex: 1, textAlign: 'right', marginLeft: space.lg, minHeight: 44 },
  chips: { flexDirection: 'row', gap: space.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  addInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: space.md },
});
