import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../theme';
import { useCurrency } from '../hooks/useCurrency';
import { AskResult } from '../ai/ask/execute';

const Bar: React.FC<{ fraction: number; color: string; track: string }> = ({ fraction, color, track }) => (
  <View style={[styles.track, { backgroundColor: track }]}>
    <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, fraction)) * 100}%`, backgroundColor: color }]} />
  </View>
);

/** Renders a computed Ask answer. Every figure here comes from the executor, never from the model. */
export const AskResultCard: React.FC<{ result: AskResult; sentence: string }> = ({ result, sentence }) => {
  const { colors, spacing, textStyles, borderRadius } = useTheme();
  const { format: money } = useCurrency();
  const muted = { color: colors.textSecondary };
  const row = { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginTop: spacing.sm };

  const body = (() => {
    switch (result.kind) {
      case 'total':
        return (
          <>
            <Text style={[textStyles.h1, { color: colors.text }]}>{money(result.value)}</Text>
            <Text style={[textStyles.bodySmall, muted]}>{result.count} {result.count === 1 ? 'purchase' : 'purchases'} · {result.label}</Text>
          </>
        );
      case 'breakdown':
        return result.rows.map((r) => (
          <View key={r.label} style={{ marginTop: spacing.sm }}>
            <View style={row}>
              <Text style={[textStyles.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{r.label}</Text>
              <Text style={[textStyles.body, { color: colors.text }]}>{money(r.value)}</Text>
            </View>
            <Bar fraction={result.total ? r.value / result.total : 0} color={r.color ?? colors.primary} track={colors.border} />
          </View>
        ));
      case 'compare': {
        const more = result.diff > 0;
        return (
          <>
            <View style={row}><Text style={[textStyles.body, muted]}>{result.b.label}</Text><Text style={[textStyles.h3, { color: colors.text }]}>{money(result.b.value)}</Text></View>
            <View style={row}><Text style={[textStyles.body, muted]}>{result.a.label}</Text><Text style={[textStyles.body, { color: colors.text }]}>{money(result.a.value)}</Text></View>
            {result.diff !== 0 && (
              <Text style={[textStyles.label, { color: more ? colors.error : colors.success, marginTop: spacing.sm }]}>
                {more ? '▲' : '▼'} {money(Math.abs(result.diff))}{result.pct != null ? ` (${Math.round(Math.abs(result.pct))}%)` : ''}
              </Text>
            )}
          </>
        );
      }
      case 'list':
        return result.rows.map((r) => (
          <View key={r.id} style={row}>
            <View style={[styles.dot, { backgroundColor: r.color }]} />
            <Text style={[textStyles.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{r.label}</Text>
            <Text style={[textStyles.bodySmall, muted, { marginHorizontal: spacing.sm }]}>{format(parseISO(r.date), 'd MMM')}</Text>
            <Text style={[textStyles.body, { color: colors.text }]}>{money(r.amount)}</Text>
          </View>
        ));
      case 'budget':
        return result.rows.map((r) => (
          <View key={r.category} style={{ marginTop: spacing.sm }}>
            <View style={row}>
              <Text style={[textStyles.body, { color: colors.text }]}>{r.category}</Text>
              <Text style={[textStyles.bodySmall, muted]}>{money(r.spent)} / {money(r.limit)}</Text>
            </View>
            <Bar fraction={r.pct / 100} color={r.pct >= 100 ? colors.error : r.pct >= 80 ? colors.warning : r.color} track={colors.border} />
          </View>
        ));
      case 'unsupported':
        return null;
    }
  })();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg }]}>
      <Text style={[textStyles.body, { color: result.kind === 'unsupported' ? colors.textSecondary : colors.text, marginBottom: body ? spacing.sm : 0 }]}>
        {sentence}
      </Text>
      {body}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {},
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  fill: { height: 6, borderRadius: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, alignSelf: 'center' },
});
