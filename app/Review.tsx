import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Kolam, KButton, useKolam, type, space } from '../src/ui';
import { useCurrency } from '../src/hooks';
import { useReview } from '../src/review/useReview';
import { reviewCards } from '../src/review/cards';

/** The Sunday review: a few full-screen pages in the kolam field, ending with one thing to do. */
export default function ReviewScreen() {
  const router = useRouter();
  const { c } = useKolam();
  const { formatWhole } = useCurrency();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Full-screen modals can report zero insets on first render; never let the bar slide under the status bar.
  const topInset = Math.max(insets.top, 54);
  const data = useReview();
  const [page, setPage] = React.useState(0);
  const scroller = React.useRef<ScrollView>(null);
  const cards = data ? reviewCards(data.input, formatWhole) : [];

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
    Haptics.selectionAsync().catch(() => {});
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={[styles.root, { backgroundColor: c.field, paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <View style={styles.segments} accessibilityLabel={`Page ${page + 1} of ${cards.length}`}>
          {cards.map((card, i) => (
            <View key={card.kind} style={[styles.seg, { backgroundColor: i <= page ? c.fieldInk : c.fieldLine }]} />
          ))}
        </View>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8} style={styles.done}>
          <Text style={[type.label, { color: c.fieldInk }]}>Done</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
      >
        {cards.map((card, i) => (
          <View key={card.kind} style={[styles.page, { width }]}>
            {card.kind === 'week' && data ? (
              <Text style={[type.sub, { color: c.fieldMuted }]}>Your week · {data.input.weekLabel}</Text>
            ) : null}
            <Text accessibilityRole="header" style={[styles.title, { color: c.fieldInk }]}>{card.title}</Text>
            {card.kind === 'week' && data ? (
              <View style={{ marginTop: space.xxl }}>
                <Kolam cells={data.cells} rows={1} width={width - space.xxl * 2} accessibilityLabel={card.title} />
              </View>
            ) : null}
            <Text style={[styles.body, { color: c.fieldMuted }]}>{card.body}</Text>

            <View style={styles.actions}>
              {card.action ? (
                <KButton
                  title={card.action.label}
                  onPress={() => {
                    const { route, params } = card.action!;
                    router.back();
                    router.push(params ? ({ pathname: route, params } as never) : (route as never));
                  }}
                />
              ) : null}
              {i < cards.length - 1 ? (
                <KButton title="Next" variant="ghost" onField onPress={() => goTo(i + 1)} style={{ marginTop: space.sm }} />
              ) : (
                <KButton title="Done" variant="ghost" onField onPress={() => router.back()} style={{ marginTop: space.sm }} />
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.sm },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  done: { minHeight: 44, justifyContent: 'center', paddingLeft: space.lg },
  page: { flex: 1, paddingHorizontal: space.xxl, paddingTop: space.xxxl * 1.5 },
  title: { fontSize: 38, fontWeight: '700', letterSpacing: -1, lineHeight: 42, marginTop: space.sm },
  body: { fontSize: 18, lineHeight: 26, marginTop: space.xl },
  actions: { position: 'absolute', left: space.xxl, right: space.xxl, bottom: space.xxl },
});
