import React from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useKolam } from './useKolam';
import { bandSegments, BandInput } from './bandMath';
import { Hatch } from './Hatch';

interface BandsProps {
  values: BandInput[];
  /** Denominator, e.g. the budget. Defaults to the sum of values. */
  total?: number;
  height?: number;
  /** Fraction 0–1 where a thin marker is drawn (e.g. today's pace). */
  marker?: number;
  /** Hatch the part of the track from `hatchFrom` to `hatchTo` (e.g. the forecast's likely range). */
  hatch?: { from: number; to: number; color?: string };
  /** Draw on the slate field instead of a light surface. */
  onField?: boolean;
  accessibilityLabel?: string;
}

/** Exact proportional bands: a segment's length is exactly its share. */
export const Bands: React.FC<BandsProps> = ({ values, total, height = 10, marker, hatch, onField, accessibilityLabel }) => {
  const { c } = useKolam();
  const [width, setWidth] = React.useState(0);
  const segments = bandSegments(values, total);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: onField ? c.fieldLine : c.hairline }]}
    >
      <View style={[styles.fill, { borderRadius: height / 2 }]}>
        {segments.map((s) => <View key={s.key} style={{ width: `${s.fraction * 100}%`, backgroundColor: s.color }} />)}
      </View>
      {hatch && width > 0 ? (
        <View style={[styles.abs, { left: hatch.from * width, width: Math.max(0, (hatch.to - hatch.from) * width) }]}>
          <Hatch width="100%" height={height} color={hatch.color ?? c.action} />
        </View>
      ) : null}
      {marker != null ? (
        <View style={[styles.marker, { left: `${Math.min(Math.max(marker, 0), 1) * 100}%`, height: height + 8, top: -4, backgroundColor: onField ? c.fieldInk : c.ink }]} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  track: { width: '100%', position: 'relative' },
  fill: { flexDirection: 'row', height: '100%', overflow: 'hidden' },
  abs: { position: 'absolute', top: 0, bottom: 0 },
  marker: { position: 'absolute', width: 2, marginLeft: -1, borderRadius: 1 },
});
