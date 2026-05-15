import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type DashMobileTableField = {
  label: string;
  value: ReactNode;
  /** Span both columns in the 2-column mobile grid */
  fullWidth?: boolean;
};

type DashMobileTableCardProps = {
  /** Primary line (e.g. entity name) */
  title: ReactNode;
  fields: DashMobileTableField[];
  /** Full-width actions (buttons, links) */
  actions?: ReactNode;
  className?: string;
};

/** Column span for a field in the 2-column mobile grid (odd count → last item full width). */
export function dashMobileFieldColSpan(index: number, total: number, fullWidth?: boolean): string {
  if (fullWidth) return "col-span-2";
  if (total % 2 === 1 && index === total - 1) return "col-span-2";
  return "";
}

/**
 * Stacked “record card” for narrow viewports — use with `md:hidden` beside a desktop `DataTable`.
 * Fields render in a 2-column grid (2×2, 2×2×1 for odd counts, etc.).
 */
export default function DashMobileTableCard({ title, fields, actions, className }: DashMobileTableCardProps) {
  return (
    <article
      className={cn(
        "dash-mobile-table-card rounded-2xl border border-white/55 bg-gradient-to-b from-softCard to-metalFace p-4 shadow-metallic-panel",
        className,
      )}
    >
      <header className="mb-3 border-b border-softBorder pb-3">
        <h3 className="font-dash text-base font-semibold leading-snug text-navy">{title}</h3>
      </header>
      {fields.length > 0 ? (
        <dl className="grid grid-cols-2 gap-2">
          {fields.map(({ label, value, fullWidth }, index) => (
            <div
              key={`${label}-${index}`}
              className={cn(
                "dash-mobile-table-card__cell min-w-0 rounded-xl border border-softBorder/75 bg-white/70 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]",
                dashMobileFieldColSpan(index, fields.length, fullWidth),
              )}
            >
              <dt className="font-dash text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</dt>
              <dd className="dash-mobile-table-card__value mt-1 min-w-0 break-words text-dash-sm text-zinc-700">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {actions ? (
        <footer className="dash-mobile-table-card__actions mt-3 grid gap-2 border-t border-softBorder pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
          {actions}
        </footer>
      ) : null}
    </article>
  );
}

export function DashMobileTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-softGray/90 shadow-soft-sm" />
      ))}
    </div>
  );
}
