import { color } from "@/lib/design-tokens";

export const brand = {
  appName: 'Anti-Scam PH',
  tagline: 'Smart reservation operations for modern resorts',
  colors: {
    white: color.surface.card,
    black: color.text.primary,
    primary: color.brand.primary,
    primaryDark: color.brand.primaryHover,
    secondary: color.brand.secondary,
    secondaryDark: color.brand.navy,
    textPrimary: color.text.primary,
    textSecondary: color.text.body,
    border: color.surface.border,
    surfaceAlt: color.surface.mutedRow,
    error: color.semantic.error,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  typography: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    h1: '32px',
    h2: '28px',
    h3: '24px',
  },
  shadows: {
    card: '0 1px 3px rgba(17, 24, 39, 0.08), 0 1px 2px rgba(17, 24, 39, 0.06)',
    hover: '0 8px 18px rgba(17, 24, 39, 0.10)',
  },
};
