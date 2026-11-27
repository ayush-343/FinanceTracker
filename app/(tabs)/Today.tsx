import React from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { Screen, Field, Card, ListRow, Bands, Kolam, KButton, Money, Symbol, Hatch, useKolam, hueMap, type, space, radii } from '../../src/ui';
import { useCurrency } from '../../src/hooks';
import { useSettingsStore } from '../../src/store';
import { useToday } from '../../src/today/useToday';
import { TransactionWithDetails } from '../../src/types';

const labelFor = (t: TransactionWithDetails) => t.merchant || t.item_name || t.notes || t.category_name;

export default function TodayScreen() {
  const router = useRouter();
  const { c, isDark } = useKolam();
  const { formatWhole } = useCurrency();
  const { data, nothingSpentToday } = useToday();
  const budgetPeriod = useSettingsStore((st) => st.budgetPeriod);
  const [kolamWidth, setKolamWidth] = React.useState(0);

  const openLog = (voice = false) => router.push(voice ? { pathname: '/Log', params: { voice: '1' } } : '/Log');
  const onKolamLayout = (e: LayoutChangeEvent) => setKolamWidth(e.nativeEvent.layout.width);

  const now = new Date();
  const hues = hueMap((data?.categories ?? []).map((x) => x.id), isDark);
  const todayCell = data?.kolam.cells.find((x) => x.iso === data.todayISO);
  const weekday = format(now, 'EEEE');
  const overBudget = data ? data.periodSpent - data.budget : 0;
  const periodWord = budgetPeriod === 'weekly' ? 'week' : 'month';

  const groups = (data?.recent ?? []).reduce<Record<string, TransactionWithDetails[]>>((acc, t) => {
    (acc[t.date] ||= []).push(t);
    return acc;
  }, {});

  return (
    <Screen
      title="Today"
      subtitle={format(now, 'EEEE, d MMMM')}
      right={
        <Pressable
          onPress={() => openLog()}
          accessibilityRole="button"
          accessibilityLabel="Log a spend"
          style={({ pressed }) => [styles.headerBtn, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Symbol name="plus" fallback="plus" color={c.ink} />
        </Pressable>
      }
    >
      <Field>
        <View style={styles.row}>
          <Text maxFontSizeMultiplier={2} style={[type.title, { color: c.fieldInk }]}>{data?.monthLabel ?? format(now, 'MMMM')}</Text>
          {data ? (
            <Text maxFontSizeMultiplier={2} style={[type.money(13, '500'), { color: c.fieldMuted }]}>{data.kolam.drawn} of {data.kolam.elapsed} {data.kolam.elapsed === 1 ? 'day' : 'days'} drawn</Text>
          ) : null}
        </View>
        <View onLayout={onKolamLayout} style={{ marginTop: space.md }}>
          {data ? (
            <Kolam
              cells={data.kolam.cells}
              rows={data.kolam.rows}
              width={kolamWidth}
              accessibilityLabel={`${data.kolam.drawn} of ${data.kolam.elapsed} days logged in ${data.monthLabel}`}
            />
          ) : null}
        </View>
        {data && todayCell?.state === 'today-open' ? (
          <>
            <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.fieldMuted, marginTop: space.md }]}>
              {data.kolam.drawn === 0 ? 'Log your first spend to draw day one.' : `Log today to close ${weekday}'s loop. Skipped days stay as dots; the pattern keeps going.`}
            </Text>
            <KButton
              title="Nothing spent today"
              variant="ghost"
              onField
              onPress={nothingSpentToday}
              accessibilityHint={`Draws ${weekday}'s loop without adding a purchase`}
              style={{ marginTop: space.md, height: 44 }}
            />
          </>
        ) : data ? (
          <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.fieldMuted, marginTop: space.md }]}>{weekday}'s loop is drawn. See you tomorrow.</Text>
        ) : null}
      </Field>

      {data ? (
        <Card>
          {data.pace.status === 'noBudget' ? (
            <>
              <Text maxFontSizeMultiplier={2} style={[type.title, { color: c.ink }]}>See what's left each day</Text>
              <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: 4 }]}>Set budgets for your categories and Today shows how much you can spend to stay on pace.</Text>
              <KButton title="Set budgets" onPress={() => router.push('/(tabs)/You')} style={{ marginTop: space.lg }} />
            </>
          ) : (
            <>
              {data.pace.status === 'onPace' ? (
                <>
                  <Money value={data.pace.leftToday} size={40} weight="700" whole />
                  <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: 6 }]}>left today to stay on pace for {formatWhole(data.budget)}</Text>
                </>
              ) : (
                <>
                  <View style={styles.row}>
                    <Money value={overBudget > 0 ? overBudget : Math.abs(data.pace.leftToday)} size={40} weight="700" whole />
                    <Hatch width={28} height={28} color={c.hatchInk} radius={8} />
                  </View>
                  <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: 6 }]}>
                    {overBudget > 0
                      ? `over your ${formatWhole(data.budget)} budget for this ${periodWord}. Plan shows where it went.`
                      : `past today's pace for ${formatWhole(data.budget)}. Tomorrow starts fresh.`}
                  </Text>
                </>
              )}
              <View style={{ marginTop: space.lg }}>
                <Bands
                  values={data.categories.map((x) => ({ key: String(x.id), value: x.spent, color: hues.get(x.id) ?? c.data }))}
                  total={Math.max(data.budget, data.periodSpent)}
                  marker={data.periodElapsed * (data.budget / Math.max(data.budget, data.periodSpent))}
                  accessibilityLabel={`${formatWhole(data.periodSpent)} spent of ${formatWhole(data.budget)}`}
                />
              </View>
              <View style={[styles.row, { marginTop: space.sm }]}>
                <Text maxFontSizeMultiplier={2} style={[type.money(12, '500'), { color: c.muted }]}>{formatWhole(data.periodSpent)} spent</Text>
                <Text maxFontSizeMultiplier={2} style={[type.money(12, '500'), { color: c.muted }]}>pace {formatWhole(data.budget * data.periodElapsed)}</Text>
              </View>
            </>
          )}
        </Card>
      ) : null}

      <View style={styles.logRow}>
        <Pressable
          onPress={() => openLog()}
          accessibilityRole="button"
          accessibilityLabel="Log a spend by typing"
          style={({ pressed }) => [styles.fauxInput, { backgroundColor: c.inputFill, borderColor: c.hairline, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text maxFontSizeMultiplier={2} style={[type.body, { color: c.muted }]}>200 coffee at Blue Tokai…</Text>
        </Pressable>
        <Pressable
          onPress={() => openLog(true)}
          accessibilityRole="button"
          accessibilityLabel="Log a spend by voice"
          style={({ pressed }) => [styles.mic, { backgroundColor: c.action, opacity: pressed ? 0.85 : 1 }]}
        >
          <Symbol name="mic.fill" fallback="mic" color={c.onAction} />
        </Pressable>
      </View>

      {data && data.recent.length === 0 ? (
        <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginHorizontal: space.xl, marginTop: space.xl }]}>Nothing logged today or yesterday yet.</Text>
      ) : null}
      {Object.entries(groups).map(([date, items]) => (
        <Card key={date} title={date === data?.todayISO ? 'Today' : 'Yesterday'} style={{ paddingVertical: space.sm }}>
          {items.map((t, i) => (
            <ListRow
              key={t.id}
              title={labelFor(t)}
              subtitle={[labelFor(t) === t.category_name ? null : t.category_name, t.source && t.source !== 'manual' ? t.source : null].filter(Boolean).join(' · ') || undefined}
              hue={hues.get(t.category_id)}
              amount={t.amount}
              last={i === items.length - 1}
              onPress={() => router.push({ pathname: '/EditTransaction', params: { transactionId: String(t.id) } })}
              accessibilityLabel={`${labelFor(t)}, ${t.category_name}, ${t.amount}`}
            />
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: space.md },
  headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: space.md - 2, marginHorizontal: space.lg, marginTop: space.md },
  fauxInput: { flex: 1, height: 52, borderRadius: radii.pill, borderWidth: 1.5, justifyContent: 'center', paddingHorizontal: space.lg + 2 },
  mic: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
