import { fetchPhilippineCities, fetchPhilippineProvinces } from "@/lib/api/locations";
import type { PhilippineLocationRow } from "@/lib/locations/philippines";
import { listMuncities, listProvinces } from "@jobuntux/psgc";

let provincesCache: PhilippineLocationRow[] | null = null;
let provincesPromise: Promise<PhilippineLocationRow[]> | null = null;

const citiesByProvince = new Map<string, PhilippineLocationRow[]>();
const citiesInFlight = new Map<string, Promise<PhilippineLocationRow[]>>();

/**
 * PSA PSGC codes for all NCR HUCs start with "138" (10 digits).
 * In @jobuntux/psgc these cities are incorrectly listed as province-level entries,
 * causing them to appear in the province dropdown and repeat in the city dropdown.
 * We group them all under a single "Metro Manila (NCR)" province entry instead.
 */
export const NCR_PROVINCE_CODE = "1300000000";
const NCR_HUC_PREFIX = "138";

export function isNcrHucProvinceCode(psgcCode: string): boolean {
  return psgcCode.startsWith(NCR_HUC_PREFIX) && psgcCode.length === 10;
}

/** Map any NCR HUC city code used as a province to the canonical NCR code. */
export function normalizeProvinceCodeForDisplay(code: string | null): string | null {
  if (code && isNcrHucProvinceCode(code)) return NCR_PROVINCE_CODE;
  return code;
}

function provincesFromPackage(): PhilippineLocationRow[] {
  const rows: PhilippineLocationRow[] = [];
  let foundNcrHuc = false;

  for (const p of listProvinces()) {
    if (isNcrHucProvinceCode(p.psgcCode)) {
      foundNcrHuc = true;
      // Skip — we'll add a single Metro Manila entry instead.
      continue;
    }
    rows.push({ code: p.psgcCode, name: p.provName.trim() });
  }

  if (foundNcrHuc) {
    // Add Metro Manila as a proper province/region entry.
    rows.push({ code: NCR_PROVINCE_CODE, name: "Metro Manila (NCR)" });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function citiesFromPackage(provinceCode: string): PhilippineLocationRow[] {
  // Metro Manila / NCR — return all 16 HUC cities from the province-level package list.
  if (provinceCode === NCR_PROVINCE_CODE || isNcrHucProvinceCode(provinceCode)) {
    const rows = listProvinces()
      .filter((p) => isNcrHucProvinceCode(p.psgcCode))
      .map((p) => ({ code: p.psgcCode, name: p.provName.trim() }));
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }

  // Regular province lookup using provCode (which listMuncities() expects).
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
 * Philippines has 82 provinces + ~3 independent cities listed at province level.
 * The demo seeder only inserts 1–3 rows; treat any API response below this as incomplete.
 */
const FULL_PROVINCE_LIST_MIN = 50;

async function loadProvincesWithFallback(): Promise<PhilippineLocationRow[]> {
  try {
    const rows = await fetchPhilippineProvinces();
    if (rows.length >= FULL_PROVINCE_LIST_MIN) {
      return rows;
    }
  } catch {
    // Backend down, proxy 502, PSGC not installed, etc.
  }
  return provincesFromPackage();
}

async function loadCitiesWithFallback(provinceCode: string): Promise<PhilippineLocationRow[]> {
  // Only trust the API city list when it returns at least as many cities as the package
  // (i.e. a full PSGC import), so partial/demo seeds don't suppress real options.
  try {
    const apiRows = await fetchPhilippineCities(provinceCode);
    const pkgRows = citiesFromPackage(provinceCode);
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
