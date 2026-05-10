import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type DashMobileTableField = {
  label: string;
  value: ReactNode;
};

type DashMobileTableCardProps = {
  /** Primary line (e.g. entity name) */
  title: ReactNode;
  fields: DashMobileTableField[];
  /** Full-width actions (buttons, links) */
  actions?: ReactNode;
  className?: string;
};

/**
 * Stacked “record card” for narrow viewports — use with `md:hidden` beside a desktop `DataTable`.
 * Badges inside `value` should use normal wrapping (see globals `.dash-mobile-table-card`).
 */
export default function DashMobileTableCard({ title, fields, actions, className }: DashMobileTableCardProps) {
  return (
    <article
      className={cn(
        "dash-mobile-table-card rounded-2xl border border-white/55 bg-gradient-to-b from-softCard to-metalFace p-4 shadow-metallic-panel",
        className,
      )}
    >
      <header className="mb-1 border-b border-softBorder pb-3">
        <h3 className="font-dash text-base font-semibold leading-snug text-navy">{title}</h3>
      </header>
      <dl className="divide-y divide-softBorder/90">
        {fields.map(({ label, value }) => (
          <div key={label} className="grid gap-1 py-3 first:pt-2">
            <dt className="font-dash text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</dt>
            <dd className="min-w-0 break-words text-dash-sm text-zinc-700">{value}</dd>
          </div>
        ))}
      </dl>
      {actions ? (
        <footer className="dash-mobile-table-card__actions mt-2 grid gap-2 border-t border-softBorder pt-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
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
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-softGray/90 shadow-soft-sm" />
      ))}
    </div>
  );
}
