import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from './colors';
import { spacing, borderRadius, iconSize, heights } from './spacing';
import { typography, textStyles } from './typography';
import { useSettingsStore } from '../store/settingsStore';

export interface Theme {
    colors: ThemeColors;
    spacing: typeof spacing;
    borderRadius: typeof borderRadius;
    iconSize: typeof iconSize;
    heights: typeof heights;
    typography: typeof typography;
    textStyles: typeof textStyles;
    isDark: boolean;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const { darkMode, isLoading } = useSettingsStore();

    // Use stored preference, fallback to system
    // When loading, use system theme to avoid flash
    const isDark = isLoading
        ? (systemColorScheme === 'dark')
        : (darkMode ?? (systemColorScheme === 'dark'));

    // Memoize theme object to prevent unnecessary re-renders
    const theme: Theme = useMemo(() => ({
        colors: isDark ? darkColors : lightColors,
        spacing,
        borderRadius,
        iconSize,
        heights,
        typography,
        textStyles,
        isDark,
    }), [isDark]);

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): Theme => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export { lightColors, darkColors };
export type { ThemeColors };
