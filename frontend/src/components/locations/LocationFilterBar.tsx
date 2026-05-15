"use client";

import type { PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import { listMuncities, listProvinces } from "@jobuntux/psgc";
import { MapPin } from "lucide-react";
import { useMemo, type ReactNode } from "react";

export type LocationFilterValue = {
  provincePsgc: string | null;
  cityPsgc: string | null;
};

type Props = {
  value: LocationFilterValue;
  onChange: (next: LocationFilterValue) => void;
  /** Label prefix, e.g. "Resort location" vs "Mailing address" */
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
    <LocationFilterRoot className={className}>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-600">
        <MapPin size={13} className="text-zinc-400" aria-hidden />
        {label}
      </span>
      <select
        className="dash-input min-w-[140px] py-2 text-sm"
        value={value.provincePsgc ?? ""}
        onChange={(e) => {
          const code = e.target.value || null;
          onChange({ provincePsgc: code, cityPsgc: null });
        }}
        aria-label={`${label} province`}
      >
        <option value="">All provinces</option>
        {provinces.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        className="dash-input min-w-[140px] py-2 text-sm disabled:opacity-50"
        value={value.cityPsgc ?? ""}
        disabled={!value.provincePsgc}
        onChange={(e) => {
          onChange({ ...value, cityPsgc: e.target.value || null });
        }}
        aria-label={`${label} city or municipality`}
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      {(value.provincePsgc || value.cityPsgc) && (
        <button
          type="button"
          className="dash-btn-secondary shrink-0 text-xs"
          onClick={() => onChange(emptyLocationFilter())}
        >
          Clear location
        </button>
      )}
    </LocationFilterRoot>
  );
}

function LocationFilterRoot({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>{children}</div>;
}
