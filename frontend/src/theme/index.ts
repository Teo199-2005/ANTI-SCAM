import { brand } from '../constants/brand';
import { color } from "@/lib/design-tokens";

export const appTheme = {
  defaultTheme: 'light',
  themes: {
    light: {
      colors: {
        primary: brand.colors.primary,
        secondary: brand.colors.secondary,
        success: color.semantic.success,
        background: brand.colors.white,
        surface: brand.colors.white,
        'on-surface': brand.colors.textPrimary,
        'on-background': brand.colors.textPrimary,
        'surface-bright': brand.colors.white,
        'surface-light': brand.colors.surfaceAlt,
        'surface-variant': brand.colors.surfaceAlt,
        info: color.semantic.info,
        error: brand.colors.error,
        warning: color.semantic.warning,
      },
    },
  },
};
