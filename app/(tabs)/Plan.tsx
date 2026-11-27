import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Screen, Field, Card, Bands, Hatch, KButton, Money, Symbol, useKolam, hueMap, type, space } from '../../src/ui';
import { useCurrency, useForecast } from '../../src/hooks';
import { useSettingsStore } from '../../src/store';
import { usePlan } from '../../src/plan/usePlan';
import { goalPlan } from '../../src/plan/goals';
import { FORECAST_INSUFFICIENT } from '../../src/ai/ask/answer';

export default function PlanScreen() {
  const router = useRouter();
  const { c, isDark } = useKolam();
  const { formatWhole } = useCurrency();
  const budgetPeriod = useSettingsStore((s) => s.budgetPeriod);
  const { forecast } = useForecast();
  const data = usePlan();

  const now = new Date();
  const todayISO = format(now, 'yyyy-MM-dd');
  const hues = hueMap((data?.categories ?? []).map((x) => x.id), isDark);
  const periodWord = budgetPeriod === 'weekly' ? 'week' : 'month';
  const daysLeft = data ? differenceInCalendarDays(parseISO(data.period.to), now) + 1 : null;

  const budgets = [...(data?.categories ?? [])].sort((a, b) => {
    const over = (x: typeof a) => (x.budget_limit > 0 ? x.spent / x.budget_limit : -1);
    return over(b) - over(a) || b.spent - a.spent;
  });

  const row = (key: string, onPress: () => void, label: string, children: React.ReactNode, last = false) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.block, { borderBottomColor: c.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 }]}
    >
      {children}
    </Pressable>
  );

  return (
    <Screen title="Plan" subtitle={data && daysLeft != null ? `${format(now, budgetPeriod === 'weekly' ? "'This week'" : 'MMMM')} · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left` : undefined}>
      <Field>
        <Text style={[type.caption, { color: c.fieldMuted }]}>Where this {periodWord} is heading</Text>
        {forecast?.status === 'ok' ? (
          <>
            <Text style={[type.money(34, '700'), { color: c.fieldInk, marginTop: space.xs }]}>
              {formatWhole(forecast.total.low)} – {formatWhole(forecast.total.high)}
            </Text>
            <Text style={[type.sub, { color: c.fieldMuted, marginTop: 2 }]}>
              likely {formatWhole(forecast.total.likely)}{forecast.total.budget > 0 ? ` of your ${formatWhole(forecast.total.budget)} budget` : ''}
            </Text>
            {(() => {
              const scale = Math.max(forecast.total.budget, forecast.total.high, 1);
              return (
                <View style={{ marginTop: space.lg }}>
                  <Bands
                    onField
                    height={12}
                    values={[{ key: 'spent', value: forecast.total.spent, color: c.fieldInk }]}
                    total={scale}
                    hatch={{ from: forecast.total.spent / scale, to: forecast.total.likely / scale }}
                    marker={forecast.total.budget > 0 ? forecast.total.budget / scale : undefined}
                    accessibilityLabel={`Spent ${formatWhole(forecast.total.spent)}, likely ${formatWhole(forecast.total.likely)}, budget ${formatWhole(forecast.total.budget)}`}
                  />
                  <View style={[styles.row, { marginTop: space.sm }]}>
                    <Text style={[type.money(12, '500'), { color: c.fieldMuted }]}>{formatWhole(forecast.total.spent)} spent</Text>
                    {forecast.total.budget > 0 ? <Text style={[type.money(12, '500'), { color: c.fieldMuted }]}>budget {formatWhole(forecast.total.budget)}</Text> : null}
                  </View>
                </View>
              );
            })()}
          </>
        ) : (
          <Text style={[type.sub, { color: c.fieldInk, marginTop: space.sm }]}>{forecast ? FORECAST_INSUFFICIENT : ' '}</Text>
        )}
      </Field>

      <Card title="Budgets">
        {budgets.length === 0 ? <Text style={[type.sub, { color: c.muted }]}>Add a category to start budgeting.</Text> : null}
        {budgets.map((cat, i) => {
          const over = cat.budget_limit > 0 ? cat.spent - cat.budget_limit : 0;
          return row(`cat-${cat.id}`, () => router.push({ pathname: '/EditCategory', params: { categoryId: String(cat.id) } }), `${cat.name}, ${formatWhole(cat.spent)} of ${formatWhole(cat.budget_limit)}. Edit`, (
            <>
              <View style={styles.row}>
                <View style={styles.name}>
                  <View style={[styles.dot, { backgroundColor: hues.get(cat.id) }]} />
                  <Text style={[type.body, { color: c.ink }]} numberOfLines={1}>{cat.name}</Text>
                </View>
                {cat.budget_limit > 0 ? (
                  <Text style={[type.money(13, '500'), { color: c.muted }]}>{formatWhole(cat.spent)} / {formatWhole(cat.budget_limit)}</Text>
                ) : (
                  <Text style={[type.caption, { color: c.muted }]}>{formatWhole(cat.spent)} · No budget · Set one</Text>
                )}
              </View>
              {cat.budget_limit > 0 ? (
                <View style={{ marginTop: space.sm }}>
                  <Bands height={8} values={[{ key: 'spent', value: cat.spent, color: hues.get(cat.id) ?? c.data }]} total={Math.max(cat.budget_limit, cat.spent)} marker={over > 0 ? cat.budget_limit / cat.spent : undefined} />
                </View>
              ) : null}
              {over > 0 ? (
                <View style={[styles.row, { justifyContent: 'flex-start', marginTop: space.sm }]}>
                  <Hatch width={12} height={12} color={c.hatchInk} radius={3} />
                  <Text style={[type.caption, { color: c.ink, marginLeft: space.sm }]}>{formatWhole(over)} over this {periodWord}</Text>
                </View>
              ) : null}
            </>
          ), i === budgets.length - 1);
        })}
        <KButton title="Add category" variant="ghost" onPress={() => router.push('/AddCategory')} style={{ marginTop: space.md, height: 44 }} />
      </Card>

      <Card title="Goals">
        {data && data.goals.length === 0 ? (
          <Text style={[type.sub, { color: c.muted }]}>Save towards something you want: a trip, a laptop, a cushion for later.</Text>
        ) : null}
        {(data?.goals ?? []).map((g, i, arr) => {
          const p = goalPlan(g, todayISO, formatWhole);
          return row(`goal-${g.id}`, () => router.push({ pathname: '/Goal', params: { goalId: String(g.id) } }), `${g.name}, ${formatWhole(g.saved)} of ${formatWhole(g.target)}. ${p.line}`, (
            <>
              <View style={styles.row}>
                <Text style={[type.body, { color: c.ink, flex: 1 }]} numberOfLines={1}>{g.name}</Text>
                <Text style={[type.money(13, '500'), { color: c.muted }]}>{formatWhole(g.saved)} / {formatWhole(g.target)}</Text>
              </View>
              <View style={{ marginTop: space.sm }}>
                <Bands height={8} values={[{ key: 'saved', value: g.saved, color: c.action }]} total={Math.max(g.target, 1)} />
              </View>
              <Text style={[type.caption, { color: c.muted, marginTop: space.sm }]}>{p.line}</Text>
            </>
          ), i === arr.length - 1);
        })}
        <KButton title="New goal" variant={data && data.goals.length === 0 ? 'primary' : 'ghost'} onPress={() => router.push('/Goal')} style={{ marginTop: space.md, height: 44 }} />
      </Card>

      <Card title="Coming up · next 2 weeks">
        {data && data.upcoming.length === 0 ? <Text style={[type.sub, { color: c.muted }]}>No subscription charges in the next two weeks.</Text> : null}
        {(data?.upcoming ?? []).map((u) => (
          <View key={u.key} style={[styles.row, styles.upcoming]}>
            <View style={styles.name}>
              <View style={[styles.dot, { backgroundColor: hues.get(u.categoryId) ?? c.data }]} />
              <Text style={[type.body, { color: c.ink }]} numberOfLines={1}>{u.name}</Text>
            </View>
            <Text style={[type.caption, { color: c.muted, marginRight: space.md }]}>{format(parseISO(u.date), 'EEE d MMM')}</Text>
            <Money value={u.amount} size={15} whole />
          </View>
        ))}
        <Pressable onPress={() => router.push('/(tabs)/Subscriptions')} accessibilityRole="button" style={[styles.row, styles.link]}>
          <Text style={[type.body, { color: c.ink }]}>Subscriptions and suggestions</Text>
          <Symbol name="chevron.right" fallback="chevron-right" color={c.muted} size={15} />
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: space.md },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: space.md },
  block: { paddingVertical: space.md, minHeight: 56 },
  upcoming: { minHeight: 44 },
  link: { minHeight: 44, marginTop: space.xs },
});
