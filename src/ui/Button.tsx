import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useKolam } from './useKolam';

interface KButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  /** Draw a ghost button on the slate field. */
  onField?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

/** Turmeric primary (the only action colour) or ghost outline. */
export const KButton: React.FC<KButtonProps> = ({ title, onPress, variant = 'primary', loading, disabled, onField, style, accessibilityHint }) => {
  const { c } = useKolam();
  const primary = variant === 'primary';
  const off = !!disabled && !loading;
  // Disabled keeps its label readable: it often says why ("Pick a category").
  const textColor = off ? c.muted : primary ? c.onAction : onField ? c.fieldInk : c.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.btn,
        primary ? { backgroundColor: off ? c.hairline : c.action } : { borderWidth: 1.5, borderColor: onField ? c.fieldLine : c.hairline },
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text maxFontSizeMultiplier={2} style={[styles.label, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  label: { fontSize: 17, fontWeight: '600' },
});
