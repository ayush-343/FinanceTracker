import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addMonths, format, isSameMonth, parseISO, startOfMonth, subMonths } from 'date-fns';
import { Screen, Field, Card, ListRow, Chip, Bands, KButton, Money, Symbol, useKolam, hueMap, type, space, radii } from '../../src/ui';
import { useActivity } from '../../src/activity/useActivity';
import { categoryShares, feedLabel, filterFeed, groupByDay } from '../../src/activity/feed';
import { buildMonthKolam } from '../../src/today/kolamGrid';
import { TransactionWithDetails } from '../../src/types';

type Mode = 'list' | 'month';
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Compact whole amounts for the small month cells: 640, 1.2k, 12k. */
const compact = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)));

export default function ActivityScreen() {
  const router = useRouter();
  const { c, isDark } = useKolam();
  const [mode, setMode] = React.useState<Mode>('list');
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));
  const [query, setQuery] = React.useState('');
  const [categoryId, setCategoryId] = React.useState<number | null>(null);
  const [day, setDay] = React.useState<string | null>(null);
  const { txs, categories, drawn } = useActivity(month);
  const params = useLocalSearchParams<{ month?: string; categoryId?: string }>();

  // Opened from an Ask answer: jump to that month and category.
  React.useEffect(() => {
    if (params.month && /^\d{4}-\d{2}$/.test(params.month)) setMonth(startOfMonth(parseISO(`${params.month}-01`)));
    setCategoryId(params.categoryId ? Number(params.categoryId) : null);
    if (params.month || params.categoryId) { setMode('list'); setDay(null); setQuery(''); }
  }, [params.month, params.categoryId]);

  const hues = hueMap(categories.map((x) => x.id), isDark);
  const all = txs ?? [];
  const shares = categoryShares(all);
  const monthTotal = shares.reduce((s, x) => s + x.total, 0);
  const visible = filterFeed(all, { query, categoryId, day: mode === 'month' ? day : null });
  const groups = groupByDay(visible);
  const isCurrent = isSameMonth(month, new Date());
  const asksQuestion = query.trim().split(/\s+/).length >= 3;

  const changeMonth = (next: Date) => { setMonth(startOfMonth(next)); setDay(null); setCategoryId(null); };
  const openEdit = (t: TransactionWithDetails) => router.push({ pathname: '/Log', params: { transactionId: String(t.id) } });

  const grid = buildMonthKolam(month.getFullYear(), month.getMonth(), drawn, format(new Date(), 'yyyy-MM-dd'));
  const dayTotals = groupByDay(all).reduce<Record<string, number>>((acc, g) => ({ ...acc, [g.date]: g.total }), {});

  const segment = (
    <View style={[styles.segment, { backgroundColor: c.hairline }]} accessibilityRole="tablist">
      {(['list', 'month'] as Mode[]).map((m) => (
        <Pressable
          key={m}
          onPress={() => setMode(m)}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === m }}
          style={[styles.segBtn, mode === m && { backgroundColor: c.surface }]}
        >
          <Text maxFontSizeMultiplier={2} style={[type.label, { color: mode === m ? c.ink : c.muted }]}>{m === 'list' ? 'List' : 'Month'}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderGroups = () => groups.map((g) => (
    <Card key={g.date} style={{ paddingVertical: space.sm }}>
      <View style={[styles.row, { paddingTop: space.xs }]}>
        <Text maxFontSizeMultiplier={2} accessibilityRole="header" style={[type.label, { color: c.muted }]}>{format(parseISO(g.date), 'EEE d MMM')}</Text>
        <Money value={g.total} size={13} weight="600" color={c.muted} whole />
      </View>
      {g.items.map((t, i) => (
        <ListRow
          key={t.id}
          title={feedLabel(t)}
          subtitle={[feedLabel(t) === t.category_name ? null : t.category_name, t.source && t.source !== 'manual' ? t.source : null].filter(Boolean).join(' · ') || undefined}
          hue={hues.get(t.category_id)}
          amount={t.amount}
          last={i === g.items.length - 1}
          onPress={() => openEdit(t)}
          accessibilityLabel={`${feedLabel(t)}, ${t.category_name}, ${t.amount}. Edit`}
        />
      ))}
    </Card>
  ));

  return (
    <Screen title="Activity" right={segment}>
      <View style={[styles.search, { backgroundColor: c.inputFill, borderColor: c.hairline }]}>
        <Symbol name="magnifyingglass" fallback="search" color={c.muted} size={17} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Swiggy, rent, coffee…"
          placeholderTextColor={c.muted}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search purchases"
          style={[type.body, styles.searchInput, { color: c.ink }]}
        />
      </View>
      {asksQuestion ? (
        <Pressable
          onPress={() => router.push({ pathname: '/(tabs)/Ask', params: { q: query.trim() } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.askRow, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Symbol name="bubble.left" fallback="message-circle" color={c.ink} size={17} />
          <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.ink, marginLeft: space.sm, flex: 1 }]} numberOfLines={1}>Ask about “{query.trim()}”</Text>
        </Pressable>
      ) : null}

      {/* The month on slate: the screen's one dominant field. */}
      <Field style={{ marginTop: space.md, paddingVertical: space.sm, paddingHorizontal: space.xs }}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => changeMonth(subMonths(month, 1))} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.chev}>
          <Symbol name="chevron.left" fallback="chevron-left" color={c.fieldInk} size={17} />
        </Pressable>
        <Text maxFontSizeMultiplier={2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} accessibilityRole="header" style={[type.title, { color: c.fieldInk, flex: 1 }]}>{format(month, 'MMMM yyyy')}</Text>
        <Money value={monthTotal} size={17} weight="700" whole color={c.fieldInk} />
        <Pressable
          onPress={() => changeMonth(addMonths(month, 1))}
          disabled={isCurrent}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: isCurrent }}
          style={[styles.chev, { opacity: isCurrent ? 0.3 : 1 }]}
        >
          <Symbol name="chevron.right" fallback="chevron-right" color={c.fieldInk} size={17} />
        </Pressable>
      </View>
        {shares.length > 0 ? (
          <View style={{ marginHorizontal: space.md, marginTop: space.xs, marginBottom: space.sm }}>
            <Bands
              onField
              height={14}
              values={shares.map((x) => ({ key: String(x.categoryId), value: x.total, color: hues.get(x.categoryId) ?? c.data }))}
              accessibilityLabel={shares.map((x) => `${x.name} ${Math.round(x.share * 100)} percent`).join(', ')}
            />
          </View>
        ) : null}
      </Field>

      {shares.length > 0 ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All" selected={categoryId == null} onPress={() => setCategoryId(null)} />
            {shares.map((x) => (
              <Chip
                key={x.categoryId}
                label={`${x.name} ${Math.round(x.share * 100)}%`}
                hue={hues.get(x.categoryId)}
                selected={categoryId === x.categoryId}
                onPress={() => setCategoryId(categoryId === x.categoryId ? null : x.categoryId)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {mode === 'month' ? (
        <Card>
          <View style={styles.gridRow}>
            {WEEKDAYS.map((w, i) => <Text maxFontSizeMultiplier={2} key={i} style={[type.caption, styles.cell, { color: c.muted, minHeight: 0 }]}>{w}</Text>)}
          </View>
          {Array.from({ length: grid.rows }).map((_, r) => (
            <View key={r} style={styles.gridRow}>
              {Array.from({ length: 7 }).map((__, col) => {
                const cell = grid.cells.find((x) => x.row === r && x.col === col);
                if (!cell) return <View key={col} style={styles.cell} />;
                const isDrawn = cell.state === 'drawn' || cell.state === 'today-drawn';
                const isToday = cell.state === 'today-drawn' || cell.state === 'today-open';
                const selected = day === cell.iso;
                const total = dayTotals[cell.iso];
                return (
                  <Pressable
                    key={col}
                    onPress={() => setDay(selected ? null : cell.iso)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${isToday ? 'Today, ' : ''}${format(parseISO(cell.iso), 'd MMMM')}${total ? `, ${total}` : ''}${isDrawn ? ', logged' : ''}`}
                    style={[styles.cell, selected && { backgroundColor: c.ink, borderRadius: radii.small }]}
                  >
                    <View style={[styles.dayRing, { borderColor: isToday ? c.action : isDrawn ? (selected ? c.ground : c.ink) : 'transparent', borderWidth: isToday ? 2.5 : 1.5 }]}>
                      <Text maxFontSizeMultiplier={2} style={[type.money(14, '600'), { color: selected ? c.ground : cell.state === 'future' ? c.muted : c.ink }]}>{cell.day}</Text>
                    </View>
                    <Text maxFontSizeMultiplier={2} style={[type.money(10, '500'), { color: selected ? c.ground : c.muted, marginTop: 2 }]}>{total ? compact(total) : ' '}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>
      ) : null}

      {txs && all.length === 0 ? (
        <Card>
          <Text maxFontSizeMultiplier={2} style={[type.title, { color: c.ink }]}>Nothing logged in {format(month, 'MMMM')}</Text>
          <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: 4 }]}>Purchases you log show up here, grouped by day.</Text>
          {isCurrent ? <KButton title="Log a spend" onPress={() => router.push('/Log')} style={{ marginTop: space.lg }} /> : null}
        </Card>
      ) : txs && visible.length === 0 ? (
        <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginHorizontal: space.xl, marginTop: space.xl }]}>
          {mode === 'month' && !day && !query && categoryId == null ? 'Tap a day to see its purchases.' : query ? `No purchases match “${query.trim()}”.` : 'No purchases here.'}
        </Text>
      ) : mode === 'month' && !day ? (
        <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginHorizontal: space.xl, marginTop: space.lg }]}>Tap a day to see its purchases.</Text>
      ) : renderGroups()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 2 },
  segBtn: { minHeight: 32, minWidth: 60, paddingHorizontal: space.md, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, height: 44, borderRadius: radii.small, borderWidth: 1, paddingHorizontal: space.md },
  searchInput: { flex: 1, marginLeft: space.sm, height: 44 },
  askRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, marginTop: space.sm, minHeight: 44, borderRadius: radii.small, paddingHorizontal: space.md },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  chev: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  gridRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52, paddingVertical: 4 },
  dayRing: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
