/**
 * Anti-Scam PH platform — single source of truth for all design tokens.
 *
 * Theme: Anti-Scam PH brand (navy + crimson + gold) — marketing and dashboard.
 * Rule: no hex/rgba literals in components except this file and tailwind.config (re-export).
 */

export const color = {
  brand: {
    /** Sidebar, table header, strongest brand surfaces — deep navy */
    navy: "#0D1E42",
    /** Secondary brand — gradients, links, focus accents, data series 2 */
    secondary: "#1A3894",
    /** ONLY filled primary CTA (buttons, links that look like buttons) — brand crimson */
    primary: "#CC1B2E",
    primaryHover: "#B00020",
    /** Passive UI accent (icons, decorative) — not for CTAs */
    sky: "#2B5CE6",
    /** Revenue / highlight metric emphasis — brand gold */
    accent: "#F5B800",
    accentHover: "#C98A00",
  },
  semantic: {
    success: "#059669",
    successMuted: "rgba(5, 150, 105, 0.12)",
    warning: "#D97706",
    warningMuted: "rgba(217, 119, 6, 0.12)",
    error: "#E11D48",
    errorMuted: "rgba(225, 29, 72, 0.12)",
    info: "#0284C7",
    infoMuted: "rgba(2, 132, 199, 0.12)",
  },
  data: {
    /** Ordered palette for charts / KPI accents — do not use for CTAs */
    s1: "#0D1E42",
    s2: "#CC1B2E",
    s3: "#059669",
    s4: "#D97706",
    s5: "#E11D48",
    s6: "#7C3AED",
    /** Bright secondary for ring / KPI — data only */
    skyBright: "#1A3894",
  },
  surface: {
    /** Light canvas workstation wash */
    app: "#F4F4F9",
    card: "#FFFFFF",
    inset: "#E8E8F0",
    /** KPI / card lower face — faint tint */
    metalFace: "#EEEEF5",
    /** Raised strip highlight adjacent to panels */
    metalGlow: "#E0E0EA",
    mutedRow: "#F4F4F9",
    hoverRow: "#EEF0FA",
    border: "#C8C8D8",
    borderStrong: "#B5B5C8",
    borderCell: "#C8C8D8",
    borderCellAlt: "#D5D5E5",
  },
  text: {
    primary: "#18181B",
    body: "#3F3F46",
    muted: "#71717A",
    subtle: "#A1A1AA",
    onDark: "#FFFFFF",
    onDarkMuted: "rgba(255, 255, 255, 0.72)",
    onDarkSubtle: "rgba(255, 255, 255, 0.55)",
  },
} as const;

export const shadow = {
  /** Specular ridge + diffuse drop — "plated" panel (navy-tinted) */
  metallicPanel:
    "0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 12px 32px rgba(13, 30, 66, 0.09), 0 2px 6px rgba(13, 30, 66, 0.05)",
  metallicPanelHover:
    "0 1px 0 rgba(255, 255, 255, 0.95) inset, 0 18px 40px rgba(13, 30, 66, 0.14), 0 4px 10px rgba(13, 30, 66, 0.07)",
  /** Top toolbar — thin lip under strip */
  topbarMetal: "0 1px 0 rgba(255, 255, 255, 0.88) inset, 0 4px 12px rgba(13, 30, 66, 0.10)",
  card: "0 2px 16px rgba(13, 30, 66, 0.07), 0 1px 4px rgba(13, 30, 66, 0.04)",
  cardHover: "0 4px 24px rgba(13, 30, 66, 0.12), 0 2px 8px rgba(13, 30, 66, 0.06)",
  topbar: "0 1px 4px rgba(13, 30, 66, 0.08)",
  tableWrap:
    "0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 8px 28px rgba(13, 30, 66, 0.12), 0 1px 3px rgba(13, 30, 66, 0.05)",
  rail:
    "4px 0 28px rgba(13, 30, 66, 0.08), inset -1px 0 0 rgba(255, 255, 255, 0.52)",
  btnPrimary: "0 2px 8px rgba(204, 27, 46, 0.30)",
  btnAccent: "0 2px 8px rgba(245, 184, 0, 0.30)",
  input: "0 1px 3px rgba(0, 0, 0, 0.04)",
  btnSm: "0 1px 3px rgba(0, 0, 0, 0.06)",
  hero: "0 4px 20px rgba(13, 30, 66, 0.25)",
} as const;

/** KPI / stat card shadow tinted by data series index */
export function shadowKpiTint(rgb: string, alpha = 0.12): string {
  return `0 2px 10px rgba(${rgb}, ${alpha}), 0 1px 3px rgba(13, 30, 66, 0.08)`;
}

/** RGB triples for rgba() builders (no hex in consumers) */
export const rgb = {
  navy: "13, 30, 66",
  /** secondary blue — KPI / links, not filled CTA */
  secondary: "26, 56, 148",
  primary: "204, 27, 46",
  success: "5, 150, 105",
  warning: "217, 119, 6",
  error: "225, 29, 72",
  info: "2, 132, 199",
  sky500: "43, 92, 230",
  violet: "124, 58, 237",
  accent: "245, 184, 0",
} as const;

export type DataSeriesKey = "s1" | "s2" | "s3" | "s4" | "s5" | "s6";

export const dataSeriesRgb: Record<DataSeriesKey, string> = {
  s1: rgb.navy,
  s2: rgb.primary,
  s3: rgb.success,
  s4: rgb.warning,
  s5: rgb.error,
  s6: rgb.violet,
};

export type KpiIconTone = "blue" | "sky" | "emerald" | "rose" | "amber" | "orange" | "violet" | "navy";

type KpiToneDef = {
  accent: string;
  rgb: string;
};

/** Stat / KPI card accents — all keys reference `color` / `rgb` above */
export const kpiTone: Record<KpiIconTone, KpiToneDef> = {
  blue: { accent: color.brand.secondary, rgb: rgb.secondary },
  sky: { accent: color.data.skyBright, rgb: rgb.sky500 },
  emerald: { accent: color.semantic.success, rgb: rgb.success },
  rose: { accent: color.semantic.error, rgb: rgb.error },
  amber: { accent: color.semantic.warning, rgb: rgb.warning },
  orange: { accent: color.brand.accentHover, rgb: rgb.accent },
  violet: { accent: color.data.s6, rgb: rgb.violet },
  navy: { accent: color.brand.navy, rgb: rgb.navy },
};

/**
 * Anti-Scam PH brand — marketing / booking page palette.
 * Never use these inside .dash-shell; dashboard uses the `color` object above.
 * (Marketing tokens provide slightly warmer/lighter variants for public-facing pages;
 *  `cl*` Tailwind names are unchanged — values map to navy / blue links / gold accents.)
 */
export const marketing = {
  /** Deep navy — primary brand for marketing pages */
  ocean: "#0D1E42",
  oceanHover: "#0A1830",
  /** Very deep navy — dark hero sections and footer background */
  oceanDeep: "#060C1A",
  /** Link & inline accent text — brand blue (crimson reserved for filled CTAs only) */
  teal: "#1A3894",
  tealLight: "#2B5CE6",
  /** Brand gold — energetic CTA accent */
  coral: "#F5B800",
  coralDark: "#C98A00",
  /** Navbar wordmark — \"SCAM\" segment (alert red, WCAG on light bg) */
  scamWordmark: "#E53935",
  /** Light canvas — section backgrounds */
  sand: "#F4F4F9",
  sandMid: "#E8E8F0",
  /** Light navy tint — subtle cards / badge bg */
  seafoam: "#D6E1FC",
} as const;

/** RGB triples for rgba() builders — marketing palette */
export const marketingRgb = {
  ocean: "13, 30, 66",
  oceanDeep: "6, 12, 26",
  teal: "26, 56, 148",
  coral: "245, 184, 0",
} as const;
