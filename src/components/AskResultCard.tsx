import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { Bands, Hatch, ListRow, Money, Symbol, useKolam, type, space, radii } from '../ui';
import { useCurrency } from '../hooks/useCurrency';
import { AskResult } from '../ai/ask/execute';

interface Props {
  result: AskResult;
  sentence: string;
  /** Category name → hue, so answers match the rest of the app. */
  hueOf: (categoryName: string) => string | undefined;
  onOpenCategory?: (categoryName: string) => void;
  onOpenPurchase?: (id: number) => void;
  onOpenMonth?: () => void;
}

/** A computed Ask answer in the Kolam world. Every figure comes from the executor; bars and rows open what's behind them. */
export const AskResultCard: React.FC<Props> = ({ result, sentence, hueOf, onOpenCategory, onOpenPurchase, onOpenMonth }) => {
  const { c } = useKolam();
  const { formatWhole } = useCurrency();
  const muted = { color: c.muted };

  const tappableRow = (key: string, label: string, onPress: (() => void) | undefined, children: React.ReactNode) => (
    <Pressable key={key} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={label}
      style={({ pressed }) => [styles.block, { opacity: pressed ? 0.6 : 1 }]}>
      {children}
    </Pressable>
  );

  const body = (() => {
    switch (result.kind) {
      case 'total':
        return tappableRow('total', `${formatWhole(result.value)}, ${result.label}. See purchases`, onOpenMonth, (
          <>
            <Money value={result.value} size={34} weight="700" whole />
            <Text style={[type.caption, muted]}>{result.count} {result.count === 1 ? 'purchase' : 'purchases'} · {result.label}</Text>
          </>
        ));
      case 'breakdown':
        return result.rows.map((r) => tappableRow(r.label, `${r.label}, ${formatWhole(r.value)}. See purchases`, onOpenCategory ? () => onOpenCategory(r.label) : undefined, (
          <>
            <View style={styles.row}>
              <Text style={[type.body, { color: c.ink, flex: 1 }]} numberOfLines={1}>{r.label}</Text>
              <Money value={r.value} size={15} whole />
            </View>
            <View style={{ marginTop: 6 }}>
              <Bands height={8} values={[{ key: r.label, value: r.value, color: hueOf(r.label) ?? c.data }]} total={Math.max(result.total, 1)} />
            </View>
          </>
        )));
      case 'compare': {
        const more = result.diff > 0;
        return (
          <>
            <View style={[styles.row, styles.block]}><Text style={[type.body, muted]}>{result.b.label}</Text><Money value={result.b.value} size={20} weight="700" whole /></View>
            <View style={[styles.row, styles.block]}><Text style={[type.body, muted]}>{result.a.label}</Text><Money value={result.a.value} size={16} whole /></View>
            {result.diff !== 0 ? (
              <View style={[styles.row, { justifyContent: 'flex-start', marginTop: space.xs }]}>
                <Symbol name={more ? 'arrow.up.right' : 'arrow.down.right'} fallback={more ? 'arrow-up-right' : 'arrow-down-right'} color={c.ink} size={15} />
                <Text style={[type.label, { color: c.ink, marginLeft: space.xs }]}>
                  {formatWhole(Math.abs(result.diff))} {more ? 'more' : 'less'}{result.pct != null ? ` (${Math.round(Math.abs(result.pct))}%)` : ''}
                </Text>
              </View>
            ) : null}
          </>
        );
      }
      case 'list':
        return result.rows.map((r, i) => (
          <ListRow key={r.id} title={r.label} subtitle={`${r.category} · ${format(parseISO(r.date), 'd MMM')}`} hue={hueOf(r.category)} amount={r.amount}
            last={i === result.rows.length - 1} onPress={onOpenPurchase ? () => onOpenPurchase(r.id) : undefined} />
        ));
      case 'budget':
        return result.rows.map((r) => tappableRow(r.category, `${r.category}, ${Math.round(r.pct)} percent of budget`, onOpenCategory ? () => onOpenCategory(r.category) : undefined, (
          <>
            <View style={styles.row}>
              <Text style={[type.body, { color: c.ink, flex: 1 }]}>{r.category}</Text>
              {r.pct >= 100 ? <Hatch width={12} height={12} color={c.hatchInk} radius={3} /> : null}
              <Text style={[type.money(13, '500'), muted, { marginLeft: space.sm }]}>{formatWhole(r.spent)} / {formatWhole(r.limit)}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <Bands height={8} values={[{ key: r.category, value: r.spent, color: hueOf(r.category) ?? c.data }]} total={Math.max(r.limit, r.spent)} />
            </View>
          </>
        )));
      case 'forecast':
        return result.forecast.status === 'ok' ? (
          <View style={styles.block}>
            <Text style={[type.money(28, '700'), { color: c.ink }]}>{formatWhole(result.forecast.total.low)} – {formatWhole(result.forecast.total.high)}</Text>
            <Text style={[type.caption, muted]}>likely {formatWhole(result.forecast.total.likely)} {result.label}</Text>
          </View>
        ) : null;
      case 'unsupported':
        return null;
    }
  })();

  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <Text style={[type.body, { color: result.kind === 'unsupported' ? c.muted : c.ink, lineHeight: 22 }]}>{sentence}</Text>
      {body ? <View style={{ marginTop: space.sm }}>{body}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, padding: space.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  block: { paddingVertical: space.sm, minHeight: 44, justifyContent: 'center' },
});
