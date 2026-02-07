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

  // Extended palette
  accentGreen: '#22C55E',
  cardDark: '#FFFFFF',
};

export const darkColors: typeof lightColors = {
  // Backgrounds
  background: '#0D0D0D',
  backgroundSecondary: '#161616',
  backgroundTertiary: '#1E1E1E',
  card: '#161616',

  // Text
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textInverse: '#0D0D0D',

  // Primary
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',

  // Status colors
  success: '#10B981',
  warning: '#FACC15',
  error: '#EF4444',
  info: '#38BDF8',

  // Borders
  border: '#262626',
  borderLight: '#333333',

  // Navigation
  tabBar: '#0D0D0D',
  tabBarBorder: '#262626',
  tabBarActive: '#3B82F6',
  tabBarInactive: '#6B7280',

  // Components
  inputBackground: '#1E1E1E',
  inputBorder: '#333333',
  placeholder: '#6B7280',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Shadow (iOS)
  shadow: '#000000',

  // Extended palette
  accentGreen: '#34D399',
  cardDark: '#1C1C1E',
};

export type ThemeColors = typeof lightColors;
