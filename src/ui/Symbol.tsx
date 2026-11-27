import React from 'react';
import { Platform } from 'react-native';
import { SymbolView, SFSymbol, SymbolWeight } from 'expo-symbols';
import { Feather } from '@expo/vector-icons';

interface SymbolProps {
  name: SFSymbol;
  /** Feather icon used where SF Symbols are unavailable (Android, web). */
  fallback: React.ComponentProps<typeof Feather>['name'];
  size?: number;
  color: string;
  weight?: SymbolWeight;
}

/** SF Symbols on iOS, Feather elsewhere. Decorative unless wrapped in a labelled control. */
export const Symbol: React.FC<SymbolProps> = ({ name, fallback, size = 20, color, weight = 'medium' }) => {
  const feather = <Feather name={fallback} size={size} color={color} />;
  if (Platform.OS !== 'ios') return feather;
  return <SymbolView name={name} size={size} tintColor={color} weight={weight} fallback={feather} />;
};
