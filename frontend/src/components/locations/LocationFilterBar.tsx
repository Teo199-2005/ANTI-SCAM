"use client";

import type { PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import { listMuncities, listProvinces } from "@jobuntux/psgc";
import { MapPin } from "lucide-react";
import { useMemo } from "react";

export type LocationFilterValue = {
  provincePsgc: string | null;
  cityPsgc: string | null;
};

type Props = {
  value: LocationFilterValue;
  onChange: (next: LocationFilterValue) => void;
  /** Accessible name for the filter group */
  label?: string;
  className?: string;
};

const empty: LocationFilterValue = { provincePsgc: null, cityPsgc: null };

export function emptyLocationFilter(): LocationFilterValue {
  return { ...empty };
}

export function locationFilterToParams(value: LocationFilterValue): Record<string, string | undefined> {
  return {
    province_psgc: value.provincePsgc ?? undefined,
    city_municipality_psgc: value.cityPsgc ?? undefined,
  };
}

export function locationFilterFromPicker(value: PhilippineLocationValue): LocationFilterValue {
  return {
    provincePsgc: value.provinceCode,
    cityPsgc: value.cityCode,
  };
}

export default function LocationFilterBar({ value, onChange, label = "Location", className = "" }: Props) {
  const provinces = useMemo(() => {
    return listProvinces()
      .map((p) => ({ code: p.psgcCode, name: p.provName.trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selectedProv = useMemo(
    () => listProvinces().find((p) => p.psgcCode === value.provincePsgc),
    [value.provincePsgc],
  );

  const cities = useMemo(() => {
    if (!selectedProv?.provCode) return [];
    return listMuncities(selectedProv.provCode)
      .map((m) => ({ code: m.psgcCode, name: m.munCityName.trim() }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedProv]);

  return (
    <div className={`dash-filter-location ${className}`.trim()} role="group" aria-label={label}>
      <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-transparent px-1 text-[11px] font-medium text-zinc-500">
        <MapPin size={13} className="text-zinc-400" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </span>
      <select
        className="dash-filter-select"
        value={value.provincePsgc ?? ""}
        onChange={(e) => {
          const code = e.target.value || null;
          onChange({ provincePsgc: code, cityPsgc: null });
        }}
        aria-label={`${label} — province`}
      >
        <option value="">All provinces</option>
        {provinces.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        className="dash-filter-select"
        value={value.cityPsgc ?? ""}
        disabled={!value.provincePsgc}
        onChange={(e) => {
          onChange({ ...value, cityPsgc: e.target.value || null });
        }}
        aria-label={`${label} — city or municipality`}
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      {(value.provincePsgc || value.cityPsgc) && (
        <button type="button" className="dash-filter-clear" onClick={() => onChange(emptyLocationFilter())}>
          Clear
        </button>
      )}
    </div>
  );
}
