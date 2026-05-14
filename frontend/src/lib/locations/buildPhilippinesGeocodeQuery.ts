import { listMuncities, listProvinces } from "@jobuntux/psgc";

/**
 * Human-readable query for Google Geocoding (city + province + country).
 * Returns null until both PSA PSGC codes are set.
 */
export function buildPhilippinesGeocodeQuery(
  provincePsgcCode: string | null | undefined,
  cityMunicipalityPsgcCode: string | null | undefined,
): string | null {
  const pCode = provincePsgcCode?.trim() ?? "";
  const cCode = cityMunicipalityPsgcCode?.trim() ?? "";
  if (!pCode || !cCode) return null;

  const prov = listProvinces().find((p) => p.psgcCode === pCode);
  if (!prov?.provCode) return null;

  const city = listMuncities(prov.provCode).find((m) => m.psgcCode === cCode);
  if (!city) return null;

  const cityName = city.munCityName.trim();
  const provName = prov.provName.trim();
  if (!cityName || !provName) return null;

  return `${cityName}, ${provName}, Philippines`;
}
