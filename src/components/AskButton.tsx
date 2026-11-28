import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';
import { useAiAvailable } from '../hooks/useAiAvailable';

/** Header button that opens Ask. Renders nothing when no on-device model is ready. */
export const AskButton: React.FC = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const available = useAiAvailable();
  if (!available) return null;
  return (
    <TouchableOpacity
      onPress={() => router.push('/Ask')}
      accessibilityRole="button"
      accessibilityLabel="Ask about your spending"
      activeOpacity={0.7}
      style={[styles.button, { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}33` }]}
    >
      <Feather name="message-circle" size={20} color={colors.primary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 8 },
});
