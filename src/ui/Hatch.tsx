import React from 'react';
import Svg, { Defs, Pattern, Line, Rect } from 'react-native-svg';

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
        <Pattern id={id} patternUnits="userSpaceOnUse" width={gap} height={gap} patternTransform="rotate(45)">
          <Line x1="0" y1="0" x2="0" y2={gap} stroke={color} strokeWidth={2} />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height={height} rx={radius} fill={`url(#${id})`} />
    </Svg>
  );
};
