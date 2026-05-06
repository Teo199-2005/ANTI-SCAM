import { color } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

/** Legacy compatibility exports; prefer direct design tokens. */
export const theme = {
  colors: {
    white: color.surface.card,
    beige: color.surface.app,
    slateBlue: color.brand.secondary,
    navy: color.brand.navy,
    skyBlue: color.brand.sky,
    neutralGray: color.surface.mutedRow,
  },
  typography: {
    heading: "font-heading",
    body: "font-body",
  },
};
export { cn };
