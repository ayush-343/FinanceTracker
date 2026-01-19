// Light and Dark theme color tokens
export const lightColors = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundTertiary: '#EBEBEB',
  card: '#FFFFFF',
  
  // Text
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  
  // Primary
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  
  // Status colors
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  info: '#0EA5E9',
  
  // Borders
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  
  // Navigation
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5E5',
  tabBarActive: '#3B82F6',
  tabBarInactive: '#999999',
  
  // Components
  inputBackground: '#F5F5F5',
  inputBorder: '#E5E5E5',
  placeholder: '#999999',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Shadow (iOS)
  shadow: '#000000',
};

export const darkColors: typeof lightColors = {
  // Backgrounds
  background: '#0A0A0A',
  backgroundSecondary: '#1A1A1A',
  backgroundTertiary: '#2A2A2A',
  card: '#1A1A1A',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textTertiary: '#737373',
  textInverse: '#1A1A1A',
  
  // Primary
  primary: '#60A5FA',
  primaryLight: '#93C5FD',
  primaryDark: '#3B82F6',
  
  // Status colors
  success: '#4ADE80',
  warning: '#FACC15',
  error: '#F87171',
  info: '#38BDF8',
  
  // Borders
  border: '#2A2A2A',
  borderLight: '#333333',
  
  // Navigation
  tabBar: '#1A1A1A',
  tabBarBorder: '#2A2A2A',
  tabBarActive: '#60A5FA',
  tabBarInactive: '#737373',
  
  // Components
  inputBackground: '#2A2A2A',
  inputBorder: '#3A3A3A',
  placeholder: '#737373',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  
  // Shadow (iOS)
  shadow: '#000000',
};

export type ThemeColors = typeof lightColors;
