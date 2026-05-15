"use client";

import { useEffect, useRef } from "react";

type RowProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel: string;
};

export function BulkSelectTh({
  checked,
  indeterminate,
  onChange,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <th className="w-10 px-2 text-center" scope="col">
      <span className="sr-only">Select all on this page</span>
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border-softBorder text-navy focus:ring-navy/30"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label="Select all on this page"
      />
    </th>
  );
}

export function BulkSelectTd({ checked, onChange, disabled, ariaLabel }: RowProps) {
  return (
    <td className="w-10 px-2 text-center">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-softBorder text-navy focus:ring-navy/30"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={ariaLabel}
      />
    </td>
  );
}

export function BulkSelectMobile({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: RowProps) {
  return (
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-softBorder text-navy focus:ring-navy/30"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
