import { TextStyle } from 'react-native';

/** Daily Kolam palette. See docs/superpowers/specs/2026-11-27-kolam-redesign-design.md (Visual system). */
export interface KolamPalette {
  ground: string;
  surface: string;
  field: string;
  fieldInk: string;
  fieldMuted: string;
  fieldLine: string;
  ink: string;
  muted: string;
  hairline: string;
  inputFill: string;
  action: string;
  onAction: string;
  data: string;
  hatchInk: string;
  scrim: string;
}

export const kolamLight: KolamPalette = {
  ground: '#EEF1EA',
  surface: '#FFFFFF',
  field: '#1E2A25',
  fieldInk: '#F4EFE6',
  fieldMuted: '#B9C4BE',
  fieldLine: '#33433B',
  ink: '#1E2A25',
  muted: '#5B6A63',
  hairline: '#D5DCD4',
  inputFill: '#FFFFFF',
  action: '#F2B21B',
  onAction: '#1E2A25',
  data: '#3D4FB3',
  hatchInk: '#1E2A25',
  scrim: 'rgba(30,42,37,0.45)',
};

export const kolamDark: KolamPalette = {
  ground: '#121A16',
  surface: '#1B2520',
  field: '#293B32',
  fieldInk: '#F4EFE6',
  fieldMuted: '#A9B5AF',
  fieldLine: '#3F5147',
  ink: '#F4EFE6',
  muted: '#A9B5AF',
  hairline: '#2C3A33',
  inputFill: '#1B2520',
  action: '#F2B21B',
  onAction: '#1E2A25',
  data: '#7C8BE0',
  hatchInk: '#F4EFE6',
  scrim: 'rgba(0,0,0,0.55)',
};

/** Fixed category hue wheel, assigned in order. */
export const CATEGORY_HUES = ['#E8623C', '#3D4FB3', '#2F9C8F', '#8E4A9E', '#C98B1D', '#5E9B3A', '#D2557A', '#4F7CAC'];
/** The same wheel lifted for dark surfaces (≥3:1 against #1B2520). */
export const CATEGORY_HUES_DARK = ['#F07A55', '#8C99E8', '#3DB5A7', '#B97FCB', '#DDA23A', '#7CBB5A', '#E3789A', '#7AA4D2'];

export const radii = { card: 20, field: 24, pill: 26, chip: 17, small: 12 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

const ROUNDED = 'ui-rounded';

export const type = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: -0.4 } as TextStyle,
  title: { fontSize: 17, fontWeight: '600' } as TextStyle,
  body: { fontSize: 16 } as TextStyle,
  sub: { fontSize: 15 } as TextStyle,
  caption: { fontSize: 13 } as TextStyle,
  label: { fontSize: 13, fontWeight: '600' } as TextStyle,
  money: (size = 16, weight: TextStyle['fontWeight'] = '600'): TextStyle => ({
    fontFamily: ROUNDED,
    fontSize: size,
    fontWeight: weight,
    fontVariant: ['tabular-nums'],
    letterSpacing: size >= 32 ? -1 : 0,
  }),
};
