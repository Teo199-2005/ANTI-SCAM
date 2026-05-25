"use client";

import {
  appCheckboxBox,
  appCheckboxBoxChecked,
  appCheckboxRow,
  appCheckboxRowChecked,
} from "@/components/shared/form/formStyles";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  useCallback,
  useId,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> & {
  label: ReactNode;
  description?: string;
};

function isInteractiveClickTarget(target: EventTarget | null): boolean {
  return Boolean((target as HTMLElement | null)?.closest("button, a, input, select, textarea"));
}

/**
 * Agreement-style checkbox: one click target for the row, no focusable hidden input
 * (prevents scrollIntoView from stretching modals).
 */
export function AppCheckbox({
  label,
  description,
  className,
  checked = false,
  disabled,
  onChange,
  name,
  id: idProp,
}: Props) {
  const autoId = useId();
  const controlId = idProp ?? autoId;

  const setChecked = useCallback(
    (next: boolean) => {
      if (disabled) return;
      onChange?.({
        target: { checked: next, type: "checkbox", name: name ?? "", id: controlId },
        currentTarget: { checked: next, type: "checkbox", name: name ?? "", id: controlId },
      } as ChangeEvent<HTMLInputElement>);
    },
    [disabled, onChange, name, controlId],
  );

  const toggle = useCallback(() => setChecked(!checked), [checked, setChecked]);

  const onRowMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled || isInteractiveClickTarget(e.target)) return;
    e.preventDefault();
    toggle();
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      id={controlId}
      role="checkbox"
      aria-checked={!!checked}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        appCheckboxRow,
        checked && appCheckboxRowChecked,
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
      onMouseDown={onRowMouseDown}
      onKeyDown={onRowKeyDown}
    >
      {name ? <input type="hidden" name={name} value={checked ? "1" : "0"} readOnly /> : null}
      <span
        className={cn("mt-0.5 shrink-0", checked ? appCheckboxBoxChecked : appCheckboxBox)}
        aria-hidden
      >
        {checked ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
      </span>
      <div className="min-w-0 flex-1 pt-px select-none">
        <div className="text-zinc-700">{label}</div>
        {description ? <p className="mt-0.5 text-xs text-zinc-500">{description}</p> : null}
      </div>
    </div>
  );
}
