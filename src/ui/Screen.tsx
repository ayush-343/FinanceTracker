import React from 'react';
import { View, Text, ScrollView, StyleSheet, ScrollViewProps, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
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
  // Once the large title has scrolled away, a compact title bar keeps the screen's name visible (iOS large-title behaviour).
  const [collapsed, setCollapsed] = React.useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > 48;
    if (next !== collapsed) setCollapsed(next);
    scrollProps?.onScroll?.(e);
  };
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.ground }]}>
      <View style={styles.root}>
      <ScrollView
        {...scrollProps}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text maxFontSizeMultiplier={1.3} accessibilityRole="header" style={[type.largeTitle, { color: c.ink }]}>{title}</Text>
            {subtitle ? <Text maxFontSizeMultiplier={2} style={[type.sub, { color: c.muted, marginTop: 2 }]}>{subtitle}</Text> : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
        {children}
      </ScrollView>
      {collapsed ? (
        <View pointerEvents="none" style={[styles.bar, { backgroundColor: c.ground, borderBottomColor: c.hairline }]}>
          <Text maxFontSizeMultiplier={1.3} style={[type.title, { color: c.ink }]} numberOfLines={1}>{title}</Text>
        </View>
      ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  titles: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
});
