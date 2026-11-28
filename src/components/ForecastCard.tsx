import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../theme';
import { useCurrency } from '../hooks/useCurrency';
import type { Forecast } from '../ai/forecast/forecast';
import { FORECAST_INSUFFICIENT } from '../ai/ask/answer';

const MAX_ROWS = 3;

/** Up to three categories, most at risk first. Shared by the Home card and Ask answers. */
export const ForecastRows: React.FC<{ forecast: Forecast; onPressCategory?: (id: number, name: string) => void }> = ({ forecast, onPressCategory }) => {
  const { colors, spacing, textStyles } = useTheme();
  const { formatWhole } = useCurrency();
  if (forecast.status !== 'ok') return null;
  const atRisk = forecast.categories.filter((c) => c.overOn).slice(0, MAX_ROWS);
  if (atRisk.length === 0) {
    return (
      <View style={[styles.row, { marginTop: spacing.sm }]}>
        <Feather name="check-circle" size={16} color={colors.success} />
        <Text style={[textStyles.bodySmall, { color: colors.text, marginLeft: spacing.xs }]}>All categories on track</Text>
      </View>
    );
  }
  return (
    <>
      {atRisk.map((c) => (
        <TouchableOpacity
          key={c.categoryId}
          disabled={!onPressCategory}
          onPress={() => onPressCategory?.(c.categoryId, c.name)}
          accessibilityRole={onPressCategory ? 'button' : undefined}
          accessibilityLabel={`${c.name}: on pace for ${formatWhole(c.likely)} of ${formatWhole(c.budget)} budget, ${c.spent > c.budget ? 'already over' : `likely over around ${format(parseISO(c.overOn!), 'd MMMM')}`}`}
          style={[styles.row, styles.riskRow]}
        >
          <View style={[styles.dot, { backgroundColor: c.color }]} />
          <Text style={[textStyles.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{c.name}</Text>
          <Feather name="alert-triangle" size={14} color={colors.error} style={{ marginRight: spacing.xs }} />
          <Text style={[textStyles.bodySmall, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {formatWhole(c.likely)} of {formatWhole(c.budget)} · {c.spent > c.budget ? 'already over' : `over ~${format(parseISO(c.overOn!), 'd MMM')}`}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );
};

/** Home card: where spending is heading this budget period. */
export const ForecastCard: React.FC<{ forecast: Forecast | null; onPressCategory?: (id: number, name: string) => void }> = ({ forecast, onPressCategory }) => {
  const { colors, spacing, textStyles, borderRadius } = useTheme();
  const { formatWhole } = useCurrency();
  if (!forecast) return null;
  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg, borderColor: colors.border }]}
      accessibilityLabel="Spending forecast"
    >
      {forecast.status === 'insufficient' ? (
        <View style={styles.row}>
          <Feather name="trending-up" size={16} color={colors.textSecondary} />
          <Text style={[textStyles.body, { color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }]}>{FORECAST_INSUFFICIENT}</Text>
        </View>
      ) : (
        <>
          <Text style={[textStyles.h3, { color: colors.text }]}>
            On pace for {formatWhole(forecast.total.low)}–{formatWhole(forecast.total.high)}
          </Text>
          <Text style={[textStyles.bodySmall, { color: colors.textSecondary }]}>
            likely {formatWhole(forecast.total.likely)}
            {forecast.total.budget > 0 ? ` of ${formatWhole(forecast.total.budget)} budget` : ''} by {format(parseISO(forecast.period.to), 'd MMM')}
          </Text>
          <ForecastRows forecast={forecast} onPressCategory={onPressCategory} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  riskRow: { minHeight: 44 },
});
