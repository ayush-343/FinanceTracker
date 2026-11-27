import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useCurrency } from '../hooks/useCurrency';
import { useKolam } from './useKolam';
import { type } from './tokens';

interface MoneyProps extends Omit<TextProps, 'children'> {
  value: number;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  /** Round to whole units (estimates, large summary figures). */
  whole?: boolean;
  /** Prefix, e.g. "−" for outflows in a feed. */
  sign?: string;
}

/** Money in SF Pro Rounded with tabular numerals. */
export const Money: React.FC<MoneyProps> = ({ value, size = 16, weight = '600', color, whole, sign = '', style, ...rest }) => {
  const { c } = useKolam();
  const { format, formatWhole } = useCurrency();
  return (
    <Text {...rest} style={[type.money(size, weight), { color: color ?? c.ink }, style]}>
      {sign}{whole ? formatWhole(value) : format(value)}
    </Text>
  );
};
