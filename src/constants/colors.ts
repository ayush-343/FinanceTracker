// Category color palette - vibrant, distinct colors
export const CATEGORY_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#78716C', // Stone
] as const;

// Progress bar color thresholds
export const PROGRESS_COLORS = {
  safe: '#22C55E',      // Green - 0-50%
  warning: '#EAB308',   // Yellow - 50-80%
  danger: '#EF4444',    // Red - 80-100%
  over: '#991B1B',      // Dark red - >100%
} as const;

// Get progress color based on percentage
export const getProgressColor = (percentage: number): string => {
  if (percentage > 100) return PROGRESS_COLORS.over;
  if (percentage >= 80) return PROGRESS_COLORS.danger;
  if (percentage >= 50) return PROGRESS_COLORS.warning;
  return PROGRESS_COLORS.safe;
};
