import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type EntityIdHintProps = {
  id: number | string;
  /** Optional second id (e.g. tenant) shown after a middle dot. */
  secondaryId?: number | string | null;
  secondaryLabel?: string;
  className?: string;
};

/** Muted monospace id line for tables, cards, and modals. */
export function EntityIdHint({
  id,
  secondaryId,
  secondaryLabel = "tenant",
  className,
}: EntityIdHintProps) {
  const parts: string[] = [`#${id}`];
  if (secondaryId != null && secondaryId !== "") {
    parts.push(`${secondaryLabel} #${secondaryId}`);
  }
  const label = parts.join(" · ");

  return (
    <span
      className={cn(
        "font-mono text-[10px] font-medium leading-tight tabular-nums text-zinc-400",
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}

type TableEntityNameWithIdProps = {
  name: ReactNode;
  id: number | string;
  tenantId?: number | string | null;
  nameClassName?: string;
  className?: string;
};

/** Resort (or entity) name with a subtle id line beneath — common in admin tables. */
export function TableEntityNameWithId({
  name,
  id,
  tenantId,
  nameClassName,
  className,
}: TableEntityNameWithIdProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className={cn("block truncate font-semibold text-navy", nameClassName)}>{name}</span>
      <EntityIdHint id={id} secondaryId={tenantId} className="mt-0.5" />
    </div>
  );
}

/** Resort name + id when both exist; id-only fallback for partial API rows. */
export function ResortEntityLabel({
  name,
  id,
  nameClassName,
}: {
  name?: string | null;
  id?: number | null;
  nameClassName?: string;
}) {
  if (id == null) return <>—</>;
  if (name?.trim()) {
    return <TableEntityNameWithId name={name} id={id} nameClassName={nameClassName} />;
  }
  return <EntityIdHint id={id} />;
}
