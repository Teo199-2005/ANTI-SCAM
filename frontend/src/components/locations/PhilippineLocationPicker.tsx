"use client";

import type { PhilippineLocationRow } from "@/lib/locations/philippines";
import { listMuncities, listProvinces } from "@jobuntux/psgc";
import { useMemo, useState } from "react";

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
};

function filterRows(rows: PhilippineLocationRow[], q: string): PhilippineLocationRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => r.name.toLowerCase().includes(needle) || r.code.includes(needle));
}

export function PhilippineLocationPicker({
  value,
  onChange,
  disabled,
  idPrefix = "ph-loc",
  legacyBarangayCodeHint,
}: Props) {
  const [pQ, setPQ] = useState("");
  const [cQ, setCQ] = useState("");

  const provinces = useMemo((): PhilippineLocationRow[] => {
    const raw = listProvinces();
    const rows = raw.map((p) => ({
      code: p.psgcCode,
      name: p.provName.trim(),
    }));
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, []);

  const selectedProvDef = useMemo(() => {
    if (!value.provinceCode) return undefined;
    return listProvinces().find((p) => p.psgcCode === value.provinceCode);
  }, [value.provinceCode]);

  const cities = useMemo((): PhilippineLocationRow[] => {
    if (!selectedProvDef?.provCode) return [];
    const raw = listMuncities(selectedProvDef.provCode);
    const rows = raw.map((m) => ({
      code: m.psgcCode,
      name: m.munCityName.trim(),
    }));
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [selectedProvDef]);

  const pFiltered = useMemo(() => filterRows(provinces, pQ), [provinces, pQ]);
  const cFiltered = useMemo(() => filterRows(cities, cQ), [cities, cQ]);

  const onProvincePick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ provinceCode: c, cityCode: null, barangayName: value.barangayName });
    setCQ("");
  };

  const onCityPick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ ...value, cityCode: c });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-prov-filter`} className="mb-1 block text-xs font-semibold text-zinc-600">
            Province
          </label>
          <input
            id={`${idPrefix}-prov-filter`}
            className="dash-input mb-1.5"
            placeholder="Search province…"
            value={pQ}
            onChange={(e) => setPQ(e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
          <select
            id={`${idPrefix}-prov`}
            className="dash-input"
            disabled={disabled}
            value={value.provinceCode ?? ""}
            onChange={(e) => onProvincePick(e.target.value)}
          >
            <option value="">Select province</option>
            {pFiltered.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-city-filter`} className="mb-1 block text-xs font-semibold text-zinc-600">
            City / municipality
          </label>
          <input
            id={`${idPrefix}-city-filter`}
            className="dash-input mb-1.5"
            placeholder="Search city…"
            value={cQ}
            onChange={(e) => setCQ(e.target.value)}
            disabled={disabled || !value.provinceCode}
            autoComplete="off"
          />
          <select
            id={`${idPrefix}-city`}
            className="dash-input"
            disabled={disabled || !value.provinceCode}
            value={value.cityCode ?? ""}
            onChange={(e) => onCityPick(e.target.value)}
          >
            <option value="">{value.provinceCode ? "Select city / municipality" : "Select province first"}</option>
            {cFiltered.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
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
    </div>
  );
}
