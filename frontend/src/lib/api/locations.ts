import { publicClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import type { PhilippineLocationRow } from "@/lib/locations/philippines";

type BarangaysPageBody = ApiEnvelope<PhilippineLocationRow[]> & {
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
};

export async function fetchPhilippineProvinces(): Promise<PhilippineLocationRow[]> {
  const { data } = await publicClient.get<ApiEnvelope<PhilippineLocationRow[]>>("/public/locations/provinces");
  return data.data ?? [];
}

export async function fetchPhilippineCities(provinceCode: string): Promise<PhilippineLocationRow[]> {
  const { data } = await publicClient.get<ApiEnvelope<PhilippineLocationRow[]>>(
    `/public/locations/provinces/${encodeURIComponent(provinceCode)}/cities`,
  );
  return data.data ?? [];
}

export async function fetchPhilippineBarangaysPage(
  cityCode: string,
  page = 1,
  perPage = 500,
): Promise<{ rows: PhilippineLocationRow[]; lastPage: number }> {
  const { data } = await publicClient.get<BarangaysPageBody>(
    `/public/locations/cities/${encodeURIComponent(cityCode)}/barangays`,
    { params: { per_page: perPage, page } },
  );
  const lastPage = data.meta?.last_page ?? 1;
  return { rows: data.data ?? [], lastPage };
}

export async function fetchPhilippineBarangaysAll(cityCode: string): Promise<PhilippineLocationRow[]> {
  const all: PhilippineLocationRow[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const { rows, lastPage: lp } = await fetchPhilippineBarangaysPage(cityCode, page, 500);
    all.push(...rows);
    lastPage = lp;
    page += 1;
  } while (page <= lastPage);
  return all;
}
