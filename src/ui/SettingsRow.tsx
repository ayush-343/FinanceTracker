import React from 'react';
import { View, Text, Pressable, Switch, StyleSheet, useWindowDimensions } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';
import { Symbol } from './Symbol';
import { useKolam } from './useKolam';
import { space, type } from './tokens';

interface SettingsRowProps {
  icon: SFSymbol;
  fallback: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (on: boolean) => void };
  destructive?: boolean;
  last?: boolean;
}

/** One row of a grouped settings list: icon, title, optional subtitle, and a value, switch or chevron. */
export const SettingsRow: React.FC<SettingsRowProps> = ({ icon, fallback, title, subtitle, value, onPress, toggle, destructive, last }) => {
  const { c } = useKolam();
  const ink = c.ink;
  // At accessibility text sizes the value moves under the label so it is never truncated.
  const stacked = useWindowDimensions().fontScale > 1.4 && !!value;
  return (
    <Pressable
      onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
      disabled={!onPress && !toggle}
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityState={toggle ? { checked: toggle.value } : undefined}
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.row, { borderBottomColor: c.hairline, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed && !toggle ? 0.6 : 1 }]}
    >
      <View style={[styles.icon, { backgroundColor: c.ground }]}>
        <Symbol name={icon} fallback={fallback} color={ink} size={17} />
      </View>
      <View style={styles.text}>
        <Text maxFontSizeMultiplier={2} style={[type.body, { color: ink, fontWeight: destructive ? '600' : '400' }]}>{title}</Text>
        {subtitle ? <Text maxFontSizeMultiplier={2} style={[type.caption, { color: c.muted, marginTop: 1 }]}>{subtitle}</Text> : null}
        {stacked ? <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: 2 }]}>{value}</Text> : null}
      </View>
      {toggle ? (
        <Switch value={toggle.value} onValueChange={toggle.onChange} trackColor={{ false: c.hairline, true: c.action }} thumbColor="#FFFFFF" ios_backgroundColor={c.hairline} />
      ) : (
        <View style={styles.trail}>
          {value && !stacked ? <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginRight: space.xs }]} numberOfLines={1}>{value}</Text> : null}
          {onPress && !destructive ? <Symbol name="chevron.right" fallback="chevron-right" color={c.muted} size={14} /> : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: space.sm },
  icon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: space.md },
  text: { flex: 1, minWidth: '50%', marginRight: space.sm },
  trail: { flexDirection: 'row', alignItems: 'center', maxWidth: '45%', flexShrink: 1 },
});
