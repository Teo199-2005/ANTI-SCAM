"use client";

import type { PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";
import { AppSelect } from "@/components/shared/form";
import { usePhilippineLocationDropdowns } from "@/lib/locations/usePhilippineLocationDropdowns";
import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";

export type LocationFilterValue = {
  provincePsgc: string | null;
  cityPsgc: string | null;
  provinceLabel?: string | null;
  cityLabel?: string | null;
};

type Props = {
  value: LocationFilterValue;
  onChange: (next: LocationFilterValue) => void;
  label?: string;
  className?: string;
};

const empty: LocationFilterValue = {
  provincePsgc: null,
  cityPsgc: null,
  provinceLabel: null,
  cityLabel: null,
};

export function emptyLocationFilter(): LocationFilterValue {
  return { ...empty };
}

export function locationFilterToParams(value: LocationFilterValue): Record<string, string | undefined> {
  return {
    province_psgc: value.provincePsgc ?? undefined,
    city_municipality_psgc: value.cityPsgc ?? undefined,
  };
}

export function locationFilterToParamsWithDisplayHints(value: LocationFilterValue): Record<string, string | undefined> {
  const base = locationFilterToParams(value);
  const provinceDisplay = value.provinceLabel?.trim() || undefined;
  const cityDisplay = value.cityLabel?.trim() || undefined;
  if (!provinceDisplay && !cityDisplay) {
    return base;
  }
  return {
    ...base,
    ...(provinceDisplay ? { province_display: provinceDisplay } : {}),
    ...(cityDisplay ? { city_display: cityDisplay } : {}),
  };
}

export function locationFilterFromPicker(value: PhilippineLocationValue): LocationFilterValue {
  return {
    provincePsgc: value.provinceCode,
    cityPsgc: value.cityCode,
    provinceLabel: null,
    cityLabel: null,
  };
}

export default function LocationFilterBar({ value, onChange, label = "Location", className = "" }: Props) {
  const { provinces, cities, loadingProvinces, loadingCities, provincesError, citiesError } =
    usePhilippineLocationDropdowns(value.provincePsgc);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const v = valueRef.current;
    if (!v.provincePsgc || !v.cityPsgc || cities.length === 0) return;
    if (!cities.some((c) => c.code === v.cityPsgc)) {
      onChangeRef.current({ ...v, cityPsgc: null, cityLabel: null });
    }
  }, [value.provincePsgc, value.cityPsgc, cities]);

  const pickProvince = (code: string | null, name: string | null) => {
    onChange({
      provincePsgc: code,
      cityPsgc: null,
      provinceLabel: name,
      cityLabel: null,
    });
  };

  const pickCity = (code: string | null, name: string | null) => {
    onChange({
      ...value,
      cityPsgc: code,
      cityLabel: name,
    });
  };

  const filterError = provincesError ?? citiesError;

  return (
    <div className={`dash-filter-location ${className}`.trim()} role="group" aria-label={label}>
      <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-transparent px-1 text-[11px] font-medium text-zinc-500">
        <MapPin size={13} className="text-zinc-400" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </span>
      <AppSelect
        variant="filter"
        value={value.provincePsgc ?? ""}
        disabled={loadingProvinces}
        loading={loadingProvinces}
        placeholder="All provinces / regions"
        aria-label={`${label} — province or region`}
        options={provinces.map((p) => ({ value: p.code, label: p.name }))}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            pickProvince(null, null);
            return;
          }
          const row = provinces.find((p) => p.code === raw);
          pickProvince(raw, row?.name ?? null);
        }}
      />
      <AppSelect
        variant="filter"
        value={value.cityPsgc ?? ""}
        disabled={!value.provincePsgc || loadingProvinces || loadingCities}
        loading={loadingCities}
        placeholder={!value.provincePsgc ? "Province first" : "All cities"}
        aria-label={`${label} — city or municipality`}
        options={cities.map((c) => ({ value: c.code, label: c.name }))}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            pickCity(null, null);
            return;
          }
          const row = cities.find((c) => c.code === raw);
          pickCity(raw, row?.name ?? null);
        }}
      />
      {filterError ? (
        <span className="w-full basis-full text-[11px] text-rose-600 sm:w-auto" role="alert">
          {filterError}
        </span>
      ) : null}
    </div>
  );
}
