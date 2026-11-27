import React from 'react';
import { View, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { useKolam } from './useKolam';
import { radii, space } from './tokens';

interface PillInputProps extends TextInputProps {
  /** Trailing round action (mic, send). */
  action?: { icon: React.ReactNode; onPress: () => void; label: string; disabled?: boolean };
}

/** 52pt pill text field with an optional turmeric round action. */
export const PillInput = React.forwardRef<TextInput, PillInputProps>(({ action, style, ...rest }, ref) => {
  const { c } = useKolam();
  return (
    <View style={styles.row}>
      <TextInput
        ref={ref}
        placeholderTextColor={c.muted}
        {...rest}
        style={[styles.input, { backgroundColor: c.inputFill, borderColor: c.hairline, color: c.ink }, style]}
      />
      {action ? (
        <Pressable
          onPress={action.onPress}
          disabled={action.disabled}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [styles.action, { backgroundColor: action.disabled ? c.hairline : c.action, opacity: pressed ? 0.8 : 1 }]}
        >
          {action.icon}
        </Pressable>
      ) : null}
    </View>
  );
});
PillInput.displayName = 'PillInput';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md - 2 },
  input: { flex: 1, minHeight: 52, borderRadius: radii.pill, borderWidth: 1.5, paddingHorizontal: space.lg + 2, fontSize: 16 },
  action: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
