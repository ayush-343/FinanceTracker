import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useKolam } from './useKolam';
import { radii, space } from './tokens';

/** The one slate "wet stone" field per screen that carries the dominant element. */
export const Field: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  const { c } = useKolam();
  return (
    <View {...rest} style={[styles.field, { backgroundColor: c.field }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { marginHorizontal: space.lg, borderRadius: radii.field, padding: space.lg },
});
