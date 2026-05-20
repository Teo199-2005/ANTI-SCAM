import { fetchPhilippineCities, fetchPhilippineProvinces } from "@/lib/api/locations";
import type { PhilippineLocationRow } from "@/lib/locations/philippines";
import { listMuncities, listProvinces } from "@jobuntux/psgc";

let provincesCache: PhilippineLocationRow[] | null = null;
let provincesPromise: Promise<PhilippineLocationRow[]> | null = null;

const citiesByProvince = new Map<string, PhilippineLocationRow[]>();
const citiesInFlight = new Map<string, Promise<PhilippineLocationRow[]>>();

/**
 * NCR (National Capital Region) has regCode "13" in @jobuntux/psgc.
 * All NCR HUCs are listed as province-level entries in listProvinces().
 * We replace them with a single "Metro Manila (NCR)" entry so the picker
 * shows the correct hierarchy (province = Metro Manila, city = Quezon City etc.)
 *
 * PSA PSGC codes for NCR cities all start with "138" and are 10 digits.
 */
export const NCR_PROVINCE_CODE = "1300000000";
const NCR_REG_CODE = "13";

/**
 * Returns true for PSGC codes that belong to NCR HUCs (regCode === "13").
 * These are listed as province-level entries in the package but should be
 * shown as city options under "Metro Manila (NCR)".
 */
export function isNcrHucProvinceCode(code: string | null | undefined): boolean {
  if (!code) return false;
  // NCR HUC psgcCodes all start with "138" and are 10 digits.
  return code.startsWith("138") && code.length === 10;
}

/** Map an NCR HUC code used as a province key to the canonical Metro Manila code. */
export function normalizeProvinceCodeForDisplay(code: string | null | undefined): string | null {
  if (!code) return null;
  if (isNcrHucProvinceCode(code)) return NCR_PROVINCE_CODE;
  return code;
}

function provincesFromPackage(): PhilippineLocationRow[] {
  const rows: PhilippineLocationRow[] = [];
  let foundNcrHuc = false;

  // listProvinces() returns ALL entries (provinces + HUCs).
  // NCR HUCs have regCode "13" — group them under a single Metro Manila entry.
  for (const p of listProvinces()) {
    if (!p?.psgcCode || !p?.provName) continue; // skip malformed rows
    if (p.regCode === NCR_REG_CODE) {
      foundNcrHuc = true;
      continue; // Skip individual NCR HUC entries; replaced by Metro Manila below.
    }
    rows.push({ code: p.psgcCode, name: p.provName.trim() });
  }

  if (foundNcrHuc) {
    rows.push({ code: NCR_PROVINCE_CODE, name: "Metro Manila (NCR)" });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

function citiesFromPackage(provinceCode: string): PhilippineLocationRow[] {
  // Metro Manila / NCR — return the 16 NCR HUC cities using listProvinces("13").
  if (provinceCode === NCR_PROVINCE_CODE || isNcrHucProvinceCode(provinceCode)) {
    const rows = listProvinces(NCR_REG_CODE)
      .filter((p) => p?.psgcCode && p?.provName)
      .map((p) => ({ code: p.psgcCode, name: p.provName.trim() }));
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }

  // Regular province: find by psgcCode or provCode, then call listMuncities(provCode).
  const prov =
    listProvinces().find((p) => p.psgcCode === provinceCode) ??
    listProvinces().find((p) => p.provCode === provinceCode);
  if (!prov?.provCode) {
    return [];
  }
  const rows = listMuncities(prov.provCode)
    .filter((m) => m?.psgcCode && m?.munCityName)
    .map((m) => ({ code: m.psgcCode, name: m.munCityName.trim() }));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

/**
 * Philippines has 82 provinces + a handful of standalone HUCs at province level.
 * The demo seeder only inserts 1–3 rows. Only trust the API when it returns a
 * full list (≥ 50 provinces), otherwise fall back to the npm package data.
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
  // Use the npm package data as the primary offline source.
  try {
    const rows = provincesFromPackage();
    if (rows.length > 0) return rows;
  } catch (err) {
    console.error("[phLocationApiCache] provincesFromPackage() failed:", err);
  }
  return [];
}

async function loadCitiesWithFallback(provinceCode: string): Promise<PhilippineLocationRow[]> {
  try {
    const apiRows = await fetchPhilippineCities(provinceCode);
    const pkgRows = citiesFromPackage(provinceCode);
    // Use API data only if it's as complete as (or more complete than) the package.
    if (apiRows.length > 0 && (pkgRows.length === 0 || apiRows.length >= pkgRows.length)) {
      return apiRows;
    }
  } catch {
    // Fallback below.
  }
  try {
    return citiesFromPackage(provinceCode);
  } catch (err) {
    console.error("[phLocationApiCache] citiesFromPackage() failed for", provinceCode, err);
    return [];
  }
}

export function clearPhilippineLocationApiCaches(): void {
  provincesCache = null;
  provincesPromise = null;
  citiesByProvince.clear();
  citiesInFlight.clear();
}

export async function getPhilippineProvincesCached(): Promise<PhilippineLocationRow[]> {
  if (provincesCache && provincesCache.length > 0) {
    return provincesCache;
  }
  if (provincesPromise) {
    return provincesPromise;
  }
  provincesPromise = loadProvincesWithFallback()
    .then((rows) => {
      // Only cache a non-empty result so we retry if something went wrong.
      if (rows.length > 0) {
        provincesCache = rows;
      }
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
