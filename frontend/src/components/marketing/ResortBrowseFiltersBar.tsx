"use client";

import { listMuncities, listProvinces } from "@jobuntux/psgc";
import type { LocationFilterValue } from "@/components/locations/LocationFilterBar";
import { cn } from "@/lib/utils";
import { Building2, ChevronDown, Crown, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";

const GOLD = "#f5a623";

type PlanFilter = "" | "business_pro" | "standard";

type Props = {
  query: string;
  onQueryChange: (v: string) => void;
  onSubmit: () => void;
  location: LocationFilterValue;
  onLocationChange: (v: LocationFilterValue) => void;
  planFilter: PlanFilter;
  onPlanFilterChange: (v: PlanFilter) => void;
  vipOnly: boolean;
  onVipOnlyChange: (v: boolean) => void;
  onClear: () => void;
  resultLabel: string;
  className?: string;
};

const fieldClass =
  "h-10 min-w-0 rounded-xl border-0 bg-transparent px-2 text-[13px] text-zinc-800 outline-none placeholder:text-zinc-400 focus:ring-0 sm:h-9 sm:rounded-full";

const selectClass =
  "h-10 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200/90 bg-white px-3 pe-8 text-[13px] font-medium text-zinc-800 outline-none focus:border-clOcean/40 sm:h-9 sm:max-w-[9.5rem] sm:min-w-[5.5rem] sm:shrink-0 sm:rounded-full sm:border-0 sm:bg-transparent sm:pe-6 sm:ps-1";

export function ResortBrowseFiltersBar({
  query,
  onQueryChange,
  onSubmit,
  location,
  onLocationChange,
  planFilter,
  onPlanFilterChange,
  vipOnly,
  onVipOnlyChange,
  onClear,
  resultLabel,
  className,
}: Props) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const provinces = useMemo(
    () =>
      listProvinces()
        .map((p) => ({ code: p.psgcCode, name: p.provName.trim() }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const selectedProv = useMemo(
    () => listProvinces().find((p) => p.psgcCode === location.provincePsgc),
    [location.provincePsgc],
  );

  const cities = useMemo(() => {
    if (!selectedProv?.provCode) return [];
    return listMuncities(selectedProv.provCode)
      .map((m) => ({ code: m.psgcCode, name: m.munCityName.trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedProv]);

  const activeFilterCount =
    (location.provincePsgc ? 1 : 0) +
    (location.cityPsgc ? 1 : 0) +
    (planFilter ? 1 : 0) +
    (vipOnly ? 1 : 0);

  return (
    <div className={cn("w-full", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
      >
        {/* Mobile: search row */}
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-1">
          <div
            className="flex min-w-0 items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 px-2 py-1 shadow-[0_12px_40px_-18px_rgba(13,30,66,0.22)] backdrop-blur-xl sm:flex-wrap sm:rounded-full sm:bg-white/75 sm:px-3 sm:py-1.5"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl bg-zinc-50/90 px-2 sm:min-w-[12rem] sm:rounded-full">
              <Search size={15} className="shrink-0 text-zinc-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search resorts…"
                aria-label="Search resorts"
                className={cn(fieldClass, "flex-1")}
              />
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:contents">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((o) => !o)}
                className={cn(
                  "inline-flex h-10 min-h-10 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold transition sm:hidden",
                  mobileFiltersOpen || activeFilterCount > 0
                    ? "border-clOcean/30 bg-sky-50 text-[#0d1f3c]"
                    : "border-zinc-200 bg-white text-zinc-700",
                )}
                aria-expanded={mobileFiltersOpen}
                aria-controls="resort-browse-filters-panel"
              >
                <SlidersHorizontal size={14} aria-hidden />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-clOcean px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
                <ChevronDown
                  size={14}
                  className={cn("transition", mobileFiltersOpen && "rotate-180")}
                  aria-hidden
                />
              </button>

              <button
                type="submit"
                className="inline-flex h-10 min-h-10 shrink-0 items-center justify-center rounded-xl px-4 text-[12px] font-bold text-white shadow-sm transition hover:brightness-105 sm:ms-0.5 sm:h-9 sm:rounded-full"
                style={{ background: `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 45%, #c9840f 100%)` }}
              >
                Go
              </button>

              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 sm:h-9 sm:w-9 sm:rounded-full"
                aria-label="Clear filters"
                title="Clear all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Desktop: inline filters */}
            <span className="hidden h-5 w-px bg-zinc-200 sm:block" aria-hidden />

            <div className="hidden items-center gap-0.5 sm:flex">
              <MapPin size={14} className="ms-1 shrink-0 text-zinc-400" aria-hidden />
              <select
                aria-label="Province"
                className={selectClass}
                value={location.provincePsgc ?? ""}
                onChange={(e) =>
                  onLocationChange({
                    provincePsgc: e.target.value || null,
                    cityPsgc: null,
                  })
                }
              >
                <option value="">All provinces</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden items-center gap-0.5 sm:flex">
              <Building2 size={14} className="ms-1 shrink-0 text-zinc-400" aria-hidden />
              <select
                aria-label="City"
                className={selectClass}
                value={location.cityPsgc ?? ""}
                disabled={!location.provincePsgc}
                onChange={(e) =>
                  onLocationChange({
                    ...location,
                    cityPsgc: e.target.value || null,
                  })
                }
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="hidden h-5 w-px bg-zinc-200 sm:block" aria-hidden />

            <div className="hidden items-center gap-0.5 sm:flex">
              <SlidersHorizontal size={14} className="ms-1 shrink-0 text-zinc-400" aria-hidden />
              <select
                aria-label="Plan"
                className={selectClass}
                value={planFilter}
                onChange={(e) => onPlanFilterChange(e.target.value as PlanFilter)}
              >
                <option value="">All plans</option>
                <option value="business_pro">Premium</option>
                <option value="standard">Standard</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => onVipOnlyChange(!vipOnly)}
              className={cn(
                "hidden h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold transition sm:inline-flex",
                vipOnly
                  ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300/80"
                  : "text-zinc-600 hover:bg-zinc-100",
              )}
              aria-pressed={vipOnly}
              title="VIP resorts only"
            >
              <Crown size={14} className={vipOnly ? "text-amber-700" : "text-zinc-400"} aria-hidden />
              <span className="hidden sm:inline">VIP</span>
            </button>
          </div>

          {/* Mobile: expandable filter panel */}
          <div
            id="resort-browse-filters-panel"
            className={cn(
              "grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-sm sm:hidden",
              !mobileFiltersOpen && "hidden",
            )}
          >
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Province</span>
              <select
                aria-label="Province"
                className={selectClass}
                value={location.provincePsgc ?? ""}
                onChange={(e) =>
                  onLocationChange({
                    provincePsgc: e.target.value || null,
                    cityPsgc: null,
                  })
                }
              >
                <option value="">All provinces</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">City</span>
              <select
                aria-label="City"
                className={selectClass}
                value={location.cityPsgc ?? ""}
                disabled={!location.provincePsgc}
                onChange={(e) =>
                  onLocationChange({
                    ...location,
                    cityPsgc: e.target.value || null,
                  })
                }
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Plan</span>
              <select
                aria-label="Plan"
                className={selectClass}
                value={planFilter}
                onChange={(e) => onPlanFilterChange(e.target.value as PlanFilter)}
              >
                <option value="">All plans</option>
                <option value="business_pro">Premium</option>
                <option value="standard">Standard</option>
              </select>
            </label>
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => onVipOnlyChange(!vipOnly)}
                className={cn(
                  "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[12px] font-semibold transition",
                  vipOnly
                    ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300/80"
                    : "border border-zinc-200 bg-white text-zinc-700",
                )}
                aria-pressed={vipOnly}
              >
                <Crown size={14} className={vipOnly ? "text-amber-700" : "text-zinc-400"} aria-hidden />
                VIP only
              </button>
            </div>
          </div>
        </div>

        <p
          className="shrink-0 px-1 text-center text-[12px] font-medium text-zinc-500 sm:text-right sm:text-[13px]"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
        >
          {resultLabel}
        </p>
      </form>
    </div>
  );
}
