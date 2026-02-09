/**
 * Color tokens for Datrix Mobile
 * Based on DESIGN.md specifications - matches web platform branding
 */

export const colors = {
  // Primary: Datrix Blue
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A', // Primary brand color
    950: '#172554',
  },

  // Secondary: Interactive Blue
  secondary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB', // Main interactive color
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#172554',
  },

  // Accent: Sky
  accent: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8', // Main accent
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
    950: '#082F49',
  },

  // Success
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
    950: '#052E16',
  },

  // Warning
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  // Danger
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },

  // Neutral (for backgrounds, text, borders)
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },
} as const;

// Semantic color mappings
export const semanticColors = {
  background: {
    light: colors.neutral[50],
    dark: colors.neutral[900],
  },
  foreground: {
    light: colors.neutral[900],
    dark: colors.neutral[50],
  },
  muted: {
    light: colors.neutral[100],
    dark: colors.neutral[800],
  },
  mutedForeground: {
    light: colors.neutral[500],
    dark: colors.neutral[400],
  },
  border: {
    light: colors.neutral[200],
    dark: colors.neutral[700],
  },
  card: {
    light: '#FFFFFF',
    dark: colors.neutral[800],
  },
} as const;

// Status colors for badges
export const statusColors = {
  not_started: colors.neutral[400],
  in_progress: colors.warning[500],
  form_filled: colors.success[500],
  handled: colors.secondary[500],
  sent_to_control: colors.primary[700],
  passed_quality_control: colors.success[600],
} as const;

export default colors;
