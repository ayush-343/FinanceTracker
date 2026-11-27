import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface SuggestionChipProps {
  label: string;
  color: string;
  onPress(): void;
}

/** Tappable "Suggested: …" chip for a category learned from the user's history. */
export const SuggestionChip: React.FC<SuggestionChipProps> = ({ label, color, onPress }) => {
  const { colors, spacing, textStyles, borderRadius } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Double tap to apply.`}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[
        styles.chip,
        {
          backgroundColor: `${color}1A`,
          borderColor: `${color}55`,
          borderRadius: borderRadius.full,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: 36,
          marginTop: spacing.sm,
        },
      ]}
    >
      <Feather name="zap" size={14} color={color} />
      <Text style={[textStyles.label, { color: colors.text, marginLeft: spacing.xs, fontWeight: '600' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: StyleSheet.hairlineWidth },
});
