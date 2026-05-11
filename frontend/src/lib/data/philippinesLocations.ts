import { listMuncities, listProvinces, listRegions } from "@jobuntux/psgc";

export type PhRegion = {
  code: string;
  name: string;
};

export type PhProvince = {
  code: string;
  name: string;
  regionCode: string;
};

export type PhCityOrMunicipality = {
  code: string;
  name: string;
  provinceCode: string;
  regionCode: string;
};

// These helpers are evaluated once in the browser bundle. The underlying PSGC
// data is static JSON, so this is effectively a build-time lookup.
const rawRegions = listRegions();
const rawProvinces = listProvinces();
const rawMuncities = listMuncities();

export const phRegions: PhRegion[] = rawRegions.map((r) => ({
  code: r.code,
  name: r.name,
}));

export const phProvinces: PhProvince[] = rawProvinces.map((p) => ({
  code: p.code,
  name: p.name,
  regionCode: p.regionCode,
}));

export const phCitiesAndMunicipalities: PhCityOrMunicipality[] = rawMuncities.map((m) => ({
  code: m.code,
  name: m.name,
  provinceCode: m.provinceCode,
  regionCode: m.regionCode,
}));

export function getProvincesForRegion(regionCode: string): PhProvince[] {
  return phProvinces.filter((p) => p.regionCode === regionCode);
}

export function getCitiesForProvince(provinceCode: string): PhCityOrMunicipality[] {
  return phCitiesAndMunicipalities.filter((m) => m.provinceCode === provinceCode);
}

