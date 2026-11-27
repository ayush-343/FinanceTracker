import React from 'react';
import { View, Text, ScrollView, StyleSheet, ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKolam } from './useKolam';
import { space, type } from './tokens';

interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Trailing header controls (log button, avatar). */
  right?: React.ReactNode;
  children: React.ReactNode;
  /** Bottom padding so content clears the tab bar. */
  bottomInset?: number;
  scrollProps?: ScrollViewProps;
}

/** Top-level tab screen: lime-wash ground, large title, scrolling content. */
export const Screen: React.FC<ScreenProps> = ({ title, subtitle, right, children, bottomInset = 100, scrollProps }) => {
  const { c } = useKolam();
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.ground }]}>
      <ScrollView
        {...scrollProps}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text accessibilityRole="header" style={[type.largeTitle, { color: c.ink }]}>{title}</Text>
            {subtitle ? <Text style={[type.sub, { color: c.muted, marginTop: 2 }]}>{subtitle}</Text> : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  titles: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
