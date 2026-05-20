"use client";

import { getPhilippineCitiesCached, getPhilippineProvincesCached } from "@/lib/locations/phLocationApiCache";
import type { PhilippineLocationRow } from "@/lib/locations/philippines";
import { useEffect, useState } from "react";

export type PhilippineLocationDropdownsState = {
  provinces: PhilippineLocationRow[];
  cities: PhilippineLocationRow[];
  loadingProvinces: boolean;
  loadingCities: boolean;
  provincesError: string | null;
  citiesError: string | null;
};

/**
 * Loads province and city rows from the Laravel public location API (same source as validation).
 */
export function usePhilippineLocationDropdowns(selectedProvinceCode: string | null): PhilippineLocationDropdownsState {
  const [provinces, setProvinces] = useState<PhilippineLocationRow[]>([]);
  const [cities, setCities] = useState<PhilippineLocationRow[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [provincesError, setProvincesError] = useState<string | null>(null);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingProvinces(true);
    setProvincesError(null);
    void getPhilippineProvincesCached()
      .then((rows) => {
        if (!cancelled) {
          setProvinces([...rows].sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setProvinces([]);
          setProvincesError(e instanceof Error ? e.message : "Could not load provinces.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedProvinceCode) {
      setCities([]);
      setCitiesError(null);
      setLoadingCities(false);
      return;
    }
    setLoadingCities(true);
    setCitiesError(null);
    void getPhilippineCitiesCached(selectedProvinceCode)
      .then((rows) => {
        if (!cancelled) {
          setCities([...rows].sort((a, b) => a.name.localeCompare(b.name)));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setCities([]);
          setCitiesError(e instanceof Error ? e.message : "Could not load cities.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProvinceCode]);

  return {
    provinces,
    cities,
    loadingProvinces,
    loadingCities,
    provincesError,
    citiesError,
  };
}
