import { cn } from "@/lib/utils";

/** Full-width fields (dashboard + wizard) */
export const appFieldInput = cn(
  "w-full min-h-[44px] rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90",
  "px-3.5 py-2.5 text-sm text-zinc-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]",
  "outline-none transition placeholder:text-zinc-400",
  "focus:border-clOcean focus:ring-2 focus:ring-clOcean/20",
  "disabled:cursor-not-allowed disabled:bg-slate-100/80 disabled:opacity-70",
);

export const appSelectNative = cn(appFieldInput, "cursor-pointer appearance-none pr-11");

export const appSelectFilter = cn(
  "h-8 min-w-[7.25rem] max-w-[10.5rem] shrink-0 cursor-pointer appearance-none rounded-lg",
  "border border-softBorderStrong bg-white py-0 pl-2.5 pr-9 text-xs text-zinc-900",
  "shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none",
  "focus:border-primaryBlue focus:ring-2 focus:ring-primaryBlue/15",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const appSelectCompact = cn(
  "h-8 shrink-0 cursor-pointer appearance-none rounded-lg border border-zinc-200/90 bg-white",
  "px-2 pr-9 text-[13px] font-semibold tabular-nums text-zinc-900 shadow-sm outline-none transition",
  "hover:border-zinc-300 focus:border-skyBlue focus:ring-2 focus:ring-skyBlue/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export const appSelectMarketing = cn(
  "h-10 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200/90 bg-white",
  "px-3 pe-9 text-[13px] font-medium text-zinc-800 outline-none",
  "focus:border-clOcean/40 focus:ring-2 focus:ring-clOcean/15",
  "sm:h-9 sm:max-w-[9.5rem] sm:min-w-[5.5rem] sm:shrink-0 sm:rounded-full sm:border-0 sm:bg-transparent sm:pe-8 sm:ps-1",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

/** Custom dropdown panel (AppSelect) — minimalist list styling */
export const appSelectMenuPanel = cn(
  "flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white",
  "shadow-[0_16px_48px_-12px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/[0.06]",
);

export const appSelectMenuSearch = cn(
  "w-full shrink-0 border-0 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm text-zinc-900",
  "placeholder:text-zinc-400 outline-none focus:bg-white",
);

export const appSelectMenuList = "min-h-0 flex-1 overflow-y-auto overscroll-contain py-1";

export const appSelectMenuOption = cn(
  "mx-1 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors",
  "hover:bg-slate-50 active:bg-slate-100",
);

export const appSelectMenuOptionSelected = "bg-clOcean/[0.08] font-medium text-[#0d1f3c]";

export const appSelectMenuOptionFocused = "bg-slate-100";

export const appLabel = "mb-1.5 block text-xs font-semibold text-zinc-600";

export const appChoiceCard = cn(
  "min-h-[48px] rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-zinc-700",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition",
  "hover:border-slate-300 hover:bg-slate-50/80",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clOcean/25",
);

export const appChoiceCardActive = cn(
  "border-clOcean bg-gradient-to-br from-clOcean/12 to-teal-50/50 text-[#0d1f3c]",
  "ring-2 ring-clOcean/25 shadow-sm",
);

export const appRadioRow = cn(
  "flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200/90",
  "bg-white px-4 py-3 text-left text-sm text-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] transition",
  "hover:border-slate-300 hover:bg-slate-50/60",
);

export const appRadioRowActive = cn(
  "border-clOcean bg-gradient-to-r from-clOcean/10 via-white to-teal-50/40 ring-1 ring-clOcean/30",
);

export const appRadioDot = cn(
  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white transition",
);

export const appRadioDotActive = "border-clOcean bg-clOcean";

export const appCheckboxRow = cn(
  "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-3 text-sm text-zinc-700",
  "transition hover:border-slate-300 hover:bg-slate-50",
);

export const appCheckboxRowChecked = cn(
  "border-clOcean/40 bg-gradient-to-r from-clOcean/10 via-white to-teal-50/40 ring-1 ring-clOcean/25",
);

/** Shared box sizing — unchecked/checked colors are mutually exclusive (cn does not merge Tailwind). */
export const appCheckboxBoxBase =
  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 transition-colors";

export const appCheckboxBox = cn(appCheckboxBoxBase, "border-slate-300 bg-white");

export const appCheckboxBoxChecked = cn(appCheckboxBoxBase, "border-[#0d1f3c] bg-[#0d1f3c]");

/** Wizard aliases (backward compatible) */
export const wizardInput = appFieldInput;
export const wizardSelectNative = appSelectNative;
export const wizardLabel = appLabel;
export const wizardChoiceCard = appChoiceCard;
export const wizardChoiceCardActive = appChoiceCardActive;
export const wizardRadioRow = appRadioRow;
export const wizardRadioRowActive = appRadioRowActive;
export const wizardRadioDot = appRadioDot;
export const wizardRadioDotActive = appRadioDotActive;
export const wizardCheckboxRow = appCheckboxRow;
export const wizardCheckboxBox = appCheckboxBox;
export const wizardCheckboxBoxChecked = appCheckboxBoxChecked;
export const wizardHint = "text-xs text-zinc-500";
export const wizardSectionTitle = "text-lg font-semibold text-[#0d1f3c]";
