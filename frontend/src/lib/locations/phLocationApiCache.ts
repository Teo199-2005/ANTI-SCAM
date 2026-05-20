import { fetchPhilippineCities, fetchPhilippineProvinces } from "@/lib/api/locations";
import type { PhilippineLocationRow } from "@/lib/locations/philippines";
import { listMuncities, listProvinces } from "@jobuntux/psgc";

let provincesCache: PhilippineLocationRow[] | null = null;
let provincesPromise: Promise<PhilippineLocationRow[]> | null = null;

const citiesByProvince = new Map<string, PhilippineLocationRow[]>();
const citiesInFlight = new Map<string, Promise<PhilippineLocationRow[]>>();

function provincesFromPackage(): PhilippineLocationRow[] {
  const rows = listProvinces().map((p) => ({
    code: p.psgcCode,
    name: p.provName.trim(),
  }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function citiesFromPackage(provinceCode: string): PhilippineLocationRow[] {
  const prov =
    listProvinces().find((p) => p.psgcCode === provinceCode) ??
    listProvinces().find((p) => p.provCode === provinceCode);
  if (!prov?.provCode) {
    return [];
  }
  const rows = listMuncities(prov.provCode).map((m) => ({
    code: m.psgcCode,
    name: m.munCityName.trim(),
  }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

/**
 * Philippines has 82 provinces + a handful of "independent cities" that appear as province-level
 * rows in some PSGC imports. A fully-seeded DB returns >= 80 rows; the demo seeder only inserts 1–3.
 * Treat any response below this threshold as an incomplete seed and use the npm package instead.
 */
const FULL_PROVINCE_LIST_MIN = 50;

async function loadProvincesWithFallback(): Promise<PhilippineLocationRow[]> {
  try {
    const rows = await fetchPhilippineProvinces();
    if (rows.length >= FULL_PROVINCE_LIST_MIN) {
      return rows;
    }
    // Partial seed (demo data only) — fall through to npm package.
  } catch {
    // Backend down, proxy 502, PSGC not installed (503), etc.
  }
  return provincesFromPackage();
}

async function loadCitiesWithFallback(provinceCode: string): Promise<PhilippineLocationRow[]> {
  // Only trust API city results when the API also has a full province list.
  // We check this by seeing if the package has more cities for this province than the API returned.
  try {
    const apiRows = await fetchPhilippineCities(provinceCode);
    const pkgRows = citiesFromPackage(provinceCode);
    // Use API only when it has at least as many cities as the npm package (full import),
    // or when the package has no data for this province at all.
    if (apiRows.length > 0 && (pkgRows.length === 0 || apiRows.length >= pkgRows.length)) {
      return apiRows;
    }
  } catch {
    // Fallback below.
  }
  return citiesFromPackage(provinceCode);
}

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
  provincesPromise = loadProvincesWithFallback()
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
  const p = loadCitiesWithFallback(key)
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
