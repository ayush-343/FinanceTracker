import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useCurrency } from '../hooks/useCurrency';
import type { SubscriptionCandidate } from '../ai/insights/detectors';

/** "You've paid Spotify ₹119 3 months in a row. Track it?" */
export const SubscriptionSuggestion: React.FC<{ candidate: SubscriptionCandidate; onTrack(): void; onDismiss(): void }> = ({ candidate, onTrack, onDismiss }) => {
  const { colors, spacing, textStyles, borderRadius } = useTheme();
  const { format } = useCurrency();
  const unit = candidate.frequency === 'monthly' ? 'months' : 'weeks';
  return (
    <View style={[styles.card, { backgroundColor: `${colors.primary}0F`, borderColor: `${colors.primary}33`, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm }]}>
      <Feather name="repeat" size={18} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={[textStyles.body, { color: colors.text }]}>
          You've paid {candidate.label} {format(candidate.amount)} {candidate.count} {unit} in a row. Track it as a subscription?
        </Text>
        <View style={[styles.actions, { marginTop: spacing.xs }]}>
          <TouchableOpacity onPress={onTrack} accessibilityRole="button" accessibilityLabel={`Track ${candidate.label} as a subscription`} style={[styles.action, { marginRight: spacing.lg }]}>
            <Text style={[textStyles.label, { color: colors.primary }]}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss} accessibilityRole="button" accessibilityLabel={`Dismiss ${candidate.label} suggestion`} style={styles.action}>
            <Text style={[textStyles.label, { color: colors.textSecondary }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderWidth: 1 },
  actions: { flexDirection: 'row' },
  action: { minHeight: 44, justifyContent: 'center' },
});
