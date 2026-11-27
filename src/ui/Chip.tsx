import React from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { useKolam } from './useKolam';
import { radii, space, type } from './tokens';

interface ChipProps {
  label: string;
  selected?: boolean;
  hue?: string;
  onPress?: () => void;
}

/** Filter or suggestion chip. 34pt tall with a 44pt hit area. */
export const Chip: React.FC<ChipProps> = ({ label, selected, hue, onPress }) => {
  const { c } = useKolam();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={{ top: 5, bottom: 5 }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.ink : c.surface, borderColor: selected ? c.ink : c.hairline, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {hue ? <View style={[styles.dot, { backgroundColor: hue }]} /> : null}
      <Text style={[type.caption, { fontSize: 14, color: selected ? c.ground : c.ink }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 14, borderRadius: radii.chip, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: space.xs + 2 },
});
