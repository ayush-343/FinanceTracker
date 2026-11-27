import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useKolam } from './useKolam';
import { Money } from './Money';
import { space, type } from './tokens';

interface ListRowProps {
  title: string;
  subtitle?: string;
  hue?: string;
  amount?: number;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  last?: boolean;
}

/** A feed row: category hue dot, title and subtitle, trailing amount. */
export const ListRow: React.FC<ListRowProps> = ({ title, subtitle, hue, amount, trailing, onPress, accessibilityLabel, last }) => {
  const { c } = useKolam();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: c.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      {hue ? <View style={[styles.dot, { backgroundColor: hue }]} /> : null}
      <View style={styles.text}>
        <Text style={[type.body, { color: c.ink }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[type.caption, { color: c.muted, marginTop: 1 }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (amount != null ? <Money value={amount} /> : null)}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: space.md },
  text: { flex: 1, marginRight: space.md },
});
