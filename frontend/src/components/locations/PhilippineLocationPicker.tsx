"use client";

import { usePhilippineLocationDropdowns } from "@/lib/locations/usePhilippineLocationDropdowns";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export type PhilippineLocationValue = {
  provinceCode: string | null;
  cityCode: string | null;
  barangayName: string | null;
};

type Props = {
  value: PhilippineLocationValue;
  onChange: (next: PhilippineLocationValue) => void;
  disabled?: boolean;
  idPrefix?: string;
  /** Shown when the API still has a legacy barangay PSGC code but no free-text name */
  legacyBarangayCodeHint?: boolean;
  /** Renders in the same row as Barangay on md+ (e.g. street line on resort profile). */
  barangayRowEnd?: ReactNode;
};

export function PhilippineLocationPicker({
  value,
  onChange,
  disabled,
  idPrefix = "ph-loc",
  legacyBarangayCodeHint,
  barangayRowEnd,
}: Props) {
  const { provinces, cities, loadingProvinces, loadingCities, provincesError, citiesError } =
    usePhilippineLocationDropdowns(value.provinceCode);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const v = valueRef.current;
    if (!v.provinceCode || !v.cityCode || cities.length === 0) return;
    if (!cities.some((c) => c.code === v.cityCode)) {
      onChangeRef.current({ ...v, cityCode: null });
    }
  }, [value.provinceCode, value.cityCode, cities]);

  const provinceSelectDisabled = Boolean(disabled || loadingProvinces);
  const citySelectDisabled = Boolean(disabled || loadingProvinces || !value.provinceCode || loadingCities);

  const onProvincePick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ provinceCode: c, cityCode: null, barangayName: value.barangayName });
  };

  const onCityPick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ ...value, cityCode: c });
  };

  const locationError = provincesError ?? citiesError;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-prov`} className="mb-1 block text-xs font-semibold text-zinc-600">
            Province / region
          </label>
          <select
            id={`${idPrefix}-prov`}
            className="dash-input"
            disabled={provinceSelectDisabled}
            value={value.provinceCode ?? ""}
            onChange={(e) => onProvincePick(e.target.value)}
          >
            <option value="">{loadingProvinces ? "Loading…" : "Select province / region"}</option>
            {provinces.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-city`} className="mb-1 block text-xs font-semibold text-zinc-600">
            City / municipality
          </label>
          <select
            id={`${idPrefix}-city`}
            className="dash-input"
            disabled={citySelectDisabled}
            value={value.cityCode ?? ""}
            onChange={(e) => onCityPick(e.target.value)}
          >
            <option value="">
              {!value.provinceCode
                ? "Select province / region first"
                : loadingCities
                  ? "Loading…"
                  : "Select city / municipality"}
            </option>
            {cities.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {locationError ? (
        <p className="text-[11px] text-rose-600" role="alert">
          {locationError}
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-zinc-500">
          Options come from the server PSGC data. For Metro Manila addresses, pick the province row that lists your city
          (often named Metro Manila or similar), then your city or municipality.
          {loadingProvinces || loadingCities ? " Loading lists…" : ""}
        </p>
      )}
      {barangayRowEnd ? (
        <div className="grid gap-3 md:grid-cols-2 md:items-start">
          <div className="min-w-0">
            <label htmlFor={`${idPrefix}-brgy`} className="mb-1 block text-xs font-semibold text-zinc-600">
              Barangay
            </label>
            <input
              id={`${idPrefix}-brgy`}
              type="text"
              className="dash-input"
              placeholder="Enter barangay…"
              maxLength={180}
              value={value.barangayName ?? ""}
              disabled={disabled || !value.cityCode}
              autoComplete="address-level4"
              onChange={(e) => {
                const v = e.target.value;
                onChange({ ...value, barangayName: v === "" ? null : v });
              }}
            />
            {legacyBarangayCodeHint ? (
              <p className="mt-1 text-xs text-zinc-500">
                Your address used an older barangay code. Enter the barangay name above to confirm your location.
              </p>
            ) : null}
          </div>
          <div className="min-w-0">{barangayRowEnd}</div>
        </div>
      ) : (
        <div>
          <label htmlFor={`${idPrefix}-brgy`} className="mb-1 block text-xs font-semibold text-zinc-600">
            Barangay
          </label>
          <input
            id={`${idPrefix}-brgy`}
            type="text"
            className="dash-input"
            placeholder="Enter barangay…"
            maxLength={180}
            value={value.barangayName ?? ""}
            disabled={disabled || !value.cityCode}
            autoComplete="address-level4"
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...value, barangayName: v === "" ? null : v });
            }}
          />
          {legacyBarangayCodeHint ? (
            <p className="mt-1 text-xs text-zinc-500">
              Your address used an older barangay code. Enter the barangay name above to confirm your location.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
