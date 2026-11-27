import React from 'react';
import { View, Text, ViewProps, StyleSheet } from 'react-native';
import { useKolam } from './useKolam';
import { radii, space, type } from './tokens';

interface CardProps extends ViewProps {
  title?: string;
}

/** White surface on the ground; holds one idea. */
export const Card: React.FC<CardProps> = ({ title, style, children, ...rest }) => {
  const { c } = useKolam();
  return (
    <View {...rest} style={[styles.card, { backgroundColor: c.surface }, style]}>
      {title ? <Text maxFontSizeMultiplier={2} accessibilityRole="header" style={[type.label, { color: c.muted, marginBottom: space.sm }]}>{title}</Text> : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg, marginTop: space.md, borderRadius: radii.card, padding: space.lg },
});
