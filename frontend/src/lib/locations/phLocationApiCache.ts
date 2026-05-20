import { fetchPhilippineCities, fetchPhilippineProvinces } from "@/lib/api/locations";
import type { PhilippineLocationRow } from "@/lib/locations/philippines";

let provincesCache: PhilippineLocationRow[] | null = null;
let provincesPromise: Promise<PhilippineLocationRow[]> | null = null;

const citiesByProvince = new Map<string, PhilippineLocationRow[]>();
const citiesInFlight = new Map<string, Promise<PhilippineLocationRow[]>>();

export function clearPhilippineLocationApiCaches(): void {
  provincesCache = null;
  provincesPromise = null;
  citiesByProvince.clear();
  citiesInFlight.clear();
}

export async function getPhilippineProvincesCached(): Promise<PhilippineLocationRow[]> {
  if (provincesCache) {
    return provincesCache;
  }
  if (provincesPromise) {
    return provincesPromise;
  }
  provincesPromise = fetchPhilippineProvinces()
    .then((rows) => {
      provincesCache = rows;
      provincesPromise = null;
      return rows;
    })
    .catch((e) => {
      provincesPromise = null;
      throw e;
    });
  return provincesPromise;
}

export async function getPhilippineCitiesCached(provinceCode: string): Promise<PhilippineLocationRow[]> {
  const key = provinceCode.trim();
  if (key === "") {
    return [];
  }
  const hit = citiesByProvince.get(key);
  if (hit) {
    return hit;
  }
  const inflight = citiesInFlight.get(key);
  if (inflight) {
    return inflight;
  }
  const p = fetchPhilippineCities(key)
    .then((rows) => {
      citiesByProvince.set(key, rows);
      citiesInFlight.delete(key);
      return rows;
    })
    .catch((e) => {
      citiesInFlight.delete(key);
      throw e;
    });
  citiesInFlight.set(key, p);
  return p;
}
