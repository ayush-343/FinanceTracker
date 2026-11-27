import React from 'react';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

interface HatchProps {
  width: number | string;
  height: number;
  color: string;
  radius?: number;
  gap?: number;
}

let hatchId = 0;

/** Diagonal hatch: the Kolam way to show "over" without shaming red. */
export const Hatch: React.FC<HatchProps> = ({ width, height, color, radius = 0, gap = 6 }) => {
  const id = React.useMemo(() => `hatch-${++hatchId}`, []);
  return (
    <Svg width={width} height={height}>
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={gap} height={gap}>
          {/* One diagonal per tile plus the two corner stubs, so lines join seamlessly across tiles. */}
          <Path d={`M0 ${gap} L${gap} 0 M-1 1 L1 -1 M${gap - 1} ${gap + 1} L${gap + 1} ${gap - 1}`} stroke={color} strokeWidth={1.6} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height={height} rx={radius} fill={`url(#${id})`} />
    </Svg>
  );
};
