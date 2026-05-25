"use client";

import {
  appRadioDot,
  appRadioDotActive,
  appRadioRow,
  appRadioRowActive,
} from "@/components/shared/form/formStyles";
import { cn } from "@/lib/utils";

export type AppRadioOption = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  name: string;
  value: string;
  options: AppRadioOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function AppRadioGroup({ name, value, options, onChange, disabled, className }: Props) {
  return (
    <div className={cn("space-y-2", className)} role="radiogroup">
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              appRadioRow,
              checked && appRadioRowActive,
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              disabled={disabled}
              className="sr-only"
              onChange={() => onChange(opt.value)}
            />
            <span className={cn(appRadioDot, checked && appRadioDotActive)} aria-hidden>
              <span className={cn("h-2 w-2 rounded-full bg-white transition", checked ? "opacity-100 scale-100" : "opacity-0 scale-0")} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-zinc-800">{opt.label}</span>
              {opt.description ? <span className="mt-0.5 block text-xs text-zinc-500">{opt.description}</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
