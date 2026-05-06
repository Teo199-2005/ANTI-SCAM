import type { Config } from "tailwindcss";
import { color, marketing, shadow } from "./src/lib/design-tokens";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        white: "#FFFFFF",
        beige: "#F5F5DC",

        navy: color.brand.navy,
        slateBlue: color.brand.secondary,
        /** Filled primary CTA only — do not use for large KPI fills */
        primaryBlue: color.brand.primary,
        primaryBlueDark: color.brand.primaryHover,
        skyBlue: color.brand.sky,

        accentOrange: color.brand.accent,
        accentOrangeDark: color.brand.accentHover,

        dashBg: color.surface.app,
        softCard: color.surface.card,
        softGray: color.surface.inset,
        metalFace: color.surface.metalFace,
        metalGlow: color.surface.metalGlow,
        neutralGray: "#F9FAFB",
        softBorder: color.surface.border,
        softBorderStrong: color.surface.borderStrong,

        /** Semantic — status badges, alerts (WCAG AA on white text at xs+) */
        dsSuccess: color.semantic.success,
        dsWarning: color.semantic.warning,
        dsError: color.semantic.error,
        dsInfo: color.semantic.info,

        /** Table / list surfaces */
        dsRowMuted: color.surface.mutedRow,
        dsRowHover: color.surface.hoverRow,
        dsBorderCell: color.surface.borderCell,
        dsBorderCellAlt: color.surface.borderCellAlt,

        /** Data viz series — charts & rings only */
        dsData1: color.data.s1,
        dsData2: color.data.s2,
        dsData3: color.data.s3,
        dsData4: color.data.s4,
        dsData5: color.data.s5,
        dsData6: color.data.s6,
        dsDataSky: color.data.skyBright,

        /**
         * Anti-Scam PH brand — marketing / booking pages ONLY.
         * Prefix: cl* — never use inside .dash-shell components.
         */
        clOcean:      marketing.ocean,
        clOceanHover: marketing.oceanHover,
        clOceanDeep:  marketing.oceanDeep,
        clTeal:       marketing.teal,
        clTealLight:  marketing.tealLight,
        clCoral:      marketing.coral,
        clCoralDark:  marketing.coralDark,
        clSand:       marketing.sand,
        clSandMid:    marketing.sandMid,
        clSeafoam:    marketing.seafoam,
      },
      fontFamily: {
        /** Marketing only — never use inside .dash-shell */
        heading: ["var(--font-playfair)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        /** Dashboard + all authenticated product UI */
        dash: ["var(--font-plus-jakarta)", "Plus Jakarta Sans", "sans-serif"],
      },
      fontSize: {
        /** Dashboard type scale — use these utilities for consistency */
        "dash-xs": ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        "dash-sm": ["0.8125rem", { lineHeight: "1.25rem", letterSpacing: "0.01em" }],
        "dash-base": ["0.875rem", { lineHeight: "1.375rem", letterSpacing: "0.01em" }],
        "dash-md": ["1rem", { lineHeight: "1.5rem", letterSpacing: "0" }],
        "dash-lg": ["1.125rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }],
        "dash-xl": ["1.25rem", { lineHeight: "1.5rem", letterSpacing: "-0.02em" }],
        "dash-2xl": ["1.5rem", { lineHeight: "1.375", letterSpacing: "-0.02em" }],
        "dash-3xl": ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.03em" }],
        "dash-4xl": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.03em" }],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.06)",
        float: "0 8px 24px rgba(13,30,66,0.14), 0 2px 6px rgba(0,0,0,0.06)",
        card: shadow.card,
        "card-hover": shadow.cardHover,
        "metallic-panel": shadow.metallicPanel,
        "metallic-panel-hover": shadow.metallicPanelHover,
        topbar: shadow.topbarMetal,
        sidebar: shadow.rail,
        "table-wrap": shadow.tableWrap,
        "dash-primary": shadow.btnPrimary,
        "dash-accent": shadow.btnAccent,
        "dash-input": shadow.input,
        "dash-btn-sm": shadow.btnSm,
        "dash-hero": shadow.hero,
        "soft-raised": "0 2px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
        "soft-inset": "inset 0 2px 4px rgba(0,0,0,0.05)",
        "soft-sm": "0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
        /** Anti-Scam PH brand marketing shadows */
        "cl-btn": "0 2px 10px rgba(13, 30, 66, 0.32)",
        "cl-card": "0 4px 24px rgba(13, 30, 66, 0.10), 0 1px 4px rgba(13, 30, 66, 0.06)",
        "cl-card-hover": "0 8px 32px rgba(13, 30, 66, 0.16), 0 2px 8px rgba(13, 30, 66, 0.08)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      spacing: {
        /** 4px base — use dash-* for layout inside dashboard */
        "dash-1": "4px",
        "dash-2": "8px",
        "dash-3": "12px",
        "dash-4": "16px",
        "dash-5": "20px",
        "dash-6": "24px",
        "dash-8": "32px",
        "dash-10": "40px",
        "dash-12": "48px",
      },
    },
  },
  plugins: [],
};

export default config;
