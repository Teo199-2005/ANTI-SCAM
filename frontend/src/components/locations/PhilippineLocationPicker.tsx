"use client";

import {
  fetchPhilippineBarangaysAll,
  fetchPhilippineCities,
  fetchPhilippineProvinces,
} from "@/lib/api/locations";
import type { PhilippineLocationRow } from "@/lib/locations/philippines";
import { useCallback, useEffect, useMemo, useState } from "react";

export type PhilippineLocationValue = {
  provinceCode: string | null;
  cityCode: string | null;
  barangayCode: string | null;
};

type Props = {
  value: PhilippineLocationValue;
  onChange: (next: PhilippineLocationValue) => void;
  disabled?: boolean;
  idPrefix?: string;
};

function filterRows(rows: PhilippineLocationRow[], q: string): PhilippineLocationRow[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => r.name.toLowerCase().includes(needle) || r.code.includes(needle));
}

export function PhilippineLocationPicker({ value, onChange, disabled, idPrefix = "ph-loc" }: Props) {
  const [provinces, setProvinces] = useState<PhilippineLocationRow[]>([]);
  const [cities, setCities] = useState<PhilippineLocationRow[]>([]);
  const [barangays, setBarangays] = useState<PhilippineLocationRow[]>([]);
  const [pQ, setPQ] = useState("");
  const [cQ, setCQ] = useState("");
  const [bQ, setBQ] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProvinces(true);
      setLoadErr(null);
      try {
        const list = await fetchPhilippineProvinces();
        if (!cancelled) setProvinces(list);
      } catch {
        if (!cancelled) setLoadErr("Could not load provinces. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoadingProvinces(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCities = useCallback(async (provinceCode: string | null) => {
    setCities([]);
    setBarangays([]);
    if (!provinceCode) return;
    setLoadingCities(true);
    setLoadErr(null);
    try {
      const list = await fetchPhilippineCities(provinceCode);
      setCities(list);
    } catch {
      setLoadErr("Could not load cities for the selected province.");
    } finally {
      setLoadingCities(false);
    }
  }, []);

  const loadBarangays = useCallback(async (cityCode: string | null) => {
    setBarangays([]);
    if (!cityCode) return;
    setLoadingBarangays(true);
    setLoadErr(null);
    try {
      const list = await fetchPhilippineBarangaysAll(cityCode);
      setBarangays(list);
    } catch {
      setLoadErr("Could not load barangays for the selected city.");
    } finally {
      setLoadingBarangays(false);
    }
  }, []);

  useEffect(() => {
    void loadCities(value.provinceCode);
  }, [value.provinceCode, loadCities]);

  useEffect(() => {
    void loadBarangays(value.cityCode);
  }, [value.cityCode, loadBarangays]);

  const pFiltered = useMemo(() => filterRows(provinces, pQ), [provinces, pQ]);
  const cFiltered = useMemo(() => filterRows(cities, cQ), [cities, cQ]);
  const bFiltered = useMemo(() => filterRows(barangays, bQ), [barangays, bQ]);

  const onProvincePick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ provinceCode: c, cityCode: null, barangayCode: null });
    setCQ("");
    setBQ("");
  };

  const onCityPick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ ...value, cityCode: c, barangayCode: null });
    setBQ("");
  };

  const onBarangayPick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ ...value, barangayCode: c });
  };

  return (
    <div className="space-y-3">
      {loadErr ? <p className="text-xs text-rose-600">{loadErr}</p> : null}
      <div className="grid gap-3 md:grid-cols-3">
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
            disabled={disabled || loadingProvinces}
            autoComplete="off"
          />
          <select
            id={`${idPrefix}-prov`}
            className="dash-input"
            disabled={disabled || loadingProvinces}
            value={value.provinceCode ?? ""}
            onChange={(e) => onProvincePick(e.target.value)}
          >
            <option value="">{loadingProvinces ? "Loading…" : "Select province"}</option>
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
            disabled={disabled || !value.provinceCode || loadingCities}
            autoComplete="off"
          />
          <select
            id={`${idPrefix}-city`}
            className="dash-input"
            disabled={disabled || !value.provinceCode || loadingCities}
            value={value.cityCode ?? ""}
            onChange={(e) => onCityPick(e.target.value)}
          >
            <option value="">{loadingCities ? "Loading…" : "Select city / municipality"}</option>
            {cFiltered.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-brgy-filter`} className="mb-1 block text-xs font-semibold text-zinc-600">
            Barangay
          </label>
          <input
            id={`${idPrefix}-brgy-filter`}
            className="dash-input mb-1.5"
            placeholder="Search barangay…"
            value={bQ}
            onChange={(e) => setBQ(e.target.value)}
            disabled={disabled || !value.cityCode || loadingBarangays}
            autoComplete="off"
          />
          <select
            id={`${idPrefix}-brgy`}
            className="dash-input"
            disabled={disabled || !value.cityCode || loadingBarangays}
            value={value.barangayCode ?? ""}
            onChange={(e) => onBarangayPick(e.target.value)}
          >
            <option value="">{loadingBarangays ? "Loading…" : "Select barangay"}</option>
            {bFiltered.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
