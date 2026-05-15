"use client";

import { Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  submitLabel?: string;
  /** Wider search field on list pages with long placeholders */
  wide?: boolean;
  /** Hide submit — filters as you type (use outside a form) */
  live?: boolean;
};

export default function DashboardFilterSearch({
  value,
  onChange,
  placeholder = "Search…",
  submitLabel = "Search",
  wide = false,
  live = false,
}: Props) {
  return (
    <>
      <div className={`dash-filter-field ${wide ? "dash-filter-field--wide" : "dash-filter-field--grow"}`}>
        <Search size={14} className="dash-filter-field-icon" aria-hidden />
        <input
          type="search"
          className="dash-filter-input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {!live && (
        <button type="submit" className="dash-filter-submit">
          {submitLabel}
        </button>
      )}
    </>
  );
}
