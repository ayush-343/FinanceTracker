import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { KolamCell } from '../today/kolamGrid';
import { useKolam } from './useKolam';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface KolamProps {
  cells: KolamCell[];
  rows: number;
  width: number;
  accessibilityLabel: string;
}

const CURVE = 0.62;
const ROW_RATIO = 0.7;
const DRAW_MS = 600;

/** Rounded-diamond loop around a dot; neighbouring loops touch at their points, forming the lattice. */
const loopPath = (x: number, y: number, hx: number, hy: number) => {
  const kx = hx * CURVE;
  const ky = hy * CURVE;
  return `M${x - hx} ${y} Q${x - kx} ${y - ky} ${x} ${y - hy} Q${x + kx} ${y - ky} ${x + hx} ${y} Q${x + kx} ${y + ky} ${x} ${y + hy} Q${x - kx} ${y + ky} ${x - hx} ${y}Z`;
};

/**
 * The month kolam. Each drawn day is a loop; skipped days stay as dots; today's loop draws itself
 * once (with a light haptic) when the day closes. Reduce Motion shows it without drawing.
 */
export const Kolam: React.FC<KolamProps> = ({ cells, rows, width, accessibilityLabel }) => {
  const { c } = useKolam();
  const reduceMotion = useReducedMotion();
  const colW = width / 7;
  const rowH = colW * ROW_RATIO;
  const hx = colW / 2;
  const hy = rowH / 2;
  const height = rowH * rows;
  const pos = (cell: KolamCell) => ({ x: colW * (cell.col + 0.5), y: rowH * (cell.row + 0.5) });

  const drawnPath = cells
    .filter((cell) => cell.state === 'drawn')
    .map((cell) => { const p = pos(cell); return loopPath(p.x, p.y, hx, hy); })
    .join(' ');

  const today = cells.find((cell) => cell.state === 'today-open' || cell.state === 'today-drawn');
  const loopLength = 4 * Math.sqrt(hx * hx + hy * hy) * 1.05;
  const offset = useSharedValue(today?.state === 'today-drawn' ? 0 : loopLength);
  const previous = React.useRef(today?.state);

  React.useEffect(() => {
    const was = previous.current;
    previous.current = today?.state;
    if (today?.state !== 'today-drawn') {
      offset.value = loopLength;
      return;
    }
    if (was === 'today-open' && !reduceMotion) {
      offset.value = loopLength;
      offset.value = withTiming(0, { duration: DRAW_MS, easing: Easing.out(Easing.cubic) });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      offset.value = 0;
    }
  }, [today?.state, loopLength, reduceMotion, offset]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  if (width <= 0) return <View style={{ height: 1 }} />;
  const todayPos = today ? pos(today) : null;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width={width} height={height}>
        {drawnPath ? <Path d={drawnPath} stroke={c.fieldInk} strokeWidth={1.8} strokeLinejoin="round" fill="none" /> : null}
        {todayPos && today?.state === 'today-open' ? (
          <Path d={loopPath(todayPos.x, todayPos.y, hx, hy)} stroke={c.action} strokeWidth={2.5} strokeDasharray="5 5" fill="none" />
        ) : null}
        {todayPos && today?.state === 'today-drawn' ? (
          <AnimatedPath
            d={loopPath(todayPos.x, todayPos.y, hx, hy)}
            stroke={c.action}
            strokeWidth={2.2}
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={`${loopLength} ${loopLength}`}
            animatedProps={animatedProps}
          />
        ) : null}
        {cells.map((cell) => {
          const p = pos(cell);
          const isToday = cell.state === 'today-open' || cell.state === 'today-drawn';
          const color = isToday ? c.action : cell.state === 'drawn' ? c.fieldInk : c.fieldMuted;
          const opacity = cell.state === 'future' || cell.state === 'before' ? 0.35 : cell.state === 'skipped' ? 0.6 : 1;
          return <Circle key={cell.iso} cx={p.x} cy={p.y} r={isToday ? 4 : 3} fill={color} opacity={opacity} />;
        })}
      </Svg>
    </View>
  );
};
