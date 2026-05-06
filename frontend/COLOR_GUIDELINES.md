# ResortStaycation Color Guidelines

## Source Of Truth
- Use `src/lib/design-tokens.ts` for all product color values.
- `tailwind.config.ts` maps these tokens into utilities (`navy`, `dsSuccess`, `softCard`, etc.).
- Avoid adding new hex/rgba literals in page/components unless absolutely necessary.

## Palette Intent
- Dashboard UI uses the cool metallic palette (`dashBg`, `metalFace`, `softCard`) plus brand blues.
- Marketing pages can be softer, but should still derive from shared token intent rather than ad-hoc colors.
- Semantic states must use semantic tokens (`dsSuccess`, `dsWarning`, `dsError`, `dsInfo`).

## Utility Classes To Prefer
- Text: `text-sem-success`, `text-sem-warning`, `text-sem-error`, `text-sem-info`
- Background: `bg-sem-success`, `bg-sem-warning`, `bg-sem-error`, `bg-sem-info`
- Muted state backgrounds: `bg-sem-success-muted`, `bg-sem-warning-muted`, `bg-sem-error-muted`, `bg-sem-info-muted`
- Borders: `border-sem-success`, `border-sem-warning`, `border-sem-error`, `border-sem-info`
- Alert wrappers: `dash-alert-error`, `dash-alert-success`

## Component Rules
- Primary CTA: `.dash-btn-primary` only.
- Accent CTA: `.dash-btn-accent` only.
- Status badges: `.dash-badge-*` semantic variants.
- Data visualization colors: `dsData1..dsData6` and `dsDataSky` only.

## Accessibility Baseline
- Body text should meet WCAG AA contrast on its background.
- Avoid low-opacity text on gradients for critical information.
- For status messaging, pair color with icon/text (never color-only meaning).

## Migration Notes
- Prefer `cn` from `src/lib/utils.ts`.
- Legacy compatibility files may exist (`src/lib/theme.ts`, `src/theme/index.ts`, `src/constants/brand.ts`), but new work should start from design tokens.
