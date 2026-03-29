/**
 * Kharcha Design Tokens
 *
 * Platform-agnostic tokens shared between Web (Next.js) and Mobile (React Native).
 * Color philosophy: warm neutrals with forest green primary + lime accent.
 * Calm, trustworthy, unhurried financial experience.
 */

export const colors = {
  // ─── Brand ───
  brand: {
    primary: '#4A7C59',
    primaryLight: '#6B9E7A',
    primaryDark: '#3A6147',
    accent: '#C8E64E',
    accentMuted: '#D4ED72',
    accentDark: '#A8C43A',
  },

  // ─── Semantic ───
  semantic: {
    credit: '#22C55E',
    creditBg: '#F0FDF4',
    creditDark: '#16A34A',
    debit: '#EF4444',
    debitBg: '#FEF2F2',
    debitDark: '#DC2626',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    info: '#3B82F6',
    infoBg: '#EFF6FF',
    success: '#10B981',
    successBg: '#ECFDF5',
  },

  // ─── Neutral (Light Mode) ───
  light: {
    bg: '#FAFAFA',
    bgElevated: '#FFFFFF',
    bgSubtle: '#F5F5F4',
    bgHover: '#F0F0EE',
    border: '#E7E5E4',
    borderSubtle: '#F0EEEC',
    borderFocus: '#4A7C59',
    text: '#1C1917',
    textSecondary: '#78716C',
    textMuted: '#A8A29E',
    textInverse: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.4)',
  },

  // ─── Neutral (Dark Mode) ───
  dark: {
    bg: '#0C0A09',
    bgElevated: '#1C1917',
    bgSubtle: '#292524',
    bgHover: '#352F2C',
    border: '#44403C',
    borderSubtle: '#292524',
    borderFocus: '#6B9E7A',
    text: '#FAFAF9',
    textSecondary: '#A8A29E',
    textMuted: '#78716C',
    textInverse: '#1C1917',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const typography = {
  family: {
    sans: "'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', monospace",
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 36,
    '4xl': 48,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  leading: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.04)',
  base: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md: '0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.03)',
  lg: '0 10px 15px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.03)',
  xl: '0 20px 25px rgba(0,0,0,0.06), 0 8px 10px rgba(0,0,0,0.04)',
  brandSm: '0 2px 8px rgba(74,124,89,0.15)',
  brandMd: '0 4px 14px rgba(74,124,89,0.20)',
  accentSm: '0 2px 8px rgba(200,230,78,0.20)',
} as const;

export const animation = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '400ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;
