import { useTheme } from '../theme';
import { kolamDark, kolamLight, KolamPalette } from './tokens';

/** The Daily Kolam palette for the current appearance (driven by the existing ThemeProvider). */
export const useKolam = (): { c: KolamPalette; isDark: boolean } => {
  const { isDark } = useTheme();
  return { c: isDark ? kolamDark : kolamLight, isDark };
};
