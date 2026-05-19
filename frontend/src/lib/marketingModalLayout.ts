import { cn } from "@/lib/utils";

/** Marketing sticky/fixed navbar uses z-50 — modals must sit above it. */
export const MARKETING_MODAL_Z = "z-[600]";
export const MARKETING_MODAL_Z_NESTED = "z-[610]";
/** Stacked above nested room booking (availability calendar). */
export const MARKETING_MODAL_Z_NESTED_DEEP = "z-[615]";
export const MARKETING_MODAL_Z_REGISTER = "z-[650]";

/**
 * Positions modal panels below the marketing nav (~4.85rem + safe area).
 * Mobile: align toward bottom; sm+: vertically centered in the remaining viewport.
 */
export const MARKETING_MODAL_FRAME_CLASS = cn(
  "relative flex min-h-full w-full flex-col items-center",
  "max-sm:justify-end sm:justify-center",
  "px-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
  "pt-[max(5.75rem,calc(env(safe-area-inset-top)+4.85rem))]",
  "sm:px-5 sm:pb-8 sm:pt-[max(6.25rem,calc(env(safe-area-inset-top)+5.35rem))]",
);

/** Max panel height leaving room for nav + gutters (56rem cap on large dialogs). */
export const MARKETING_MODAL_PANEL_MAX_H = "max-h-[min(calc(100dvh-6.5rem),56rem)]";

/** Medium catalog / website preview panels. */
export const MARKETING_MODAL_PANEL_MAX_H_MD = "max-h-[min(calc(100dvh-6.5rem),40rem)]";

/** Rooms preview panel. */
export const MARKETING_MODAL_PANEL_MAX_H_LG = "max-h-[min(calc(100dvh-6.5rem),52rem)]";

/** Centered overlay frame for full-screen room / availability dialogs. */
export const MARKETING_MODAL_CENTER_FRAME_CLASS = cn(
  "relative flex min-h-full w-full items-center justify-center",
  "p-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
  "pt-[max(5.75rem,calc(env(safe-area-inset-top)+4.85rem))]",
  "sm:p-6 sm:pb-8 sm:pt-[max(6.25rem,calc(env(safe-area-inset-top)+5.35rem))]",
);
