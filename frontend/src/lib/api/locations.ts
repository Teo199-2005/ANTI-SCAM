import { publicClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";
import type { PhilippineLocationRow } from "@/lib/locations/philippines";
import axios from "axios";

type BarangaysPageBody = ApiEnvelope<PhilippineLocationRow[]> & {
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
};

/** Laravel JSON `message` from error responses (4xx/5xx) proxied through Next.js. */
function readApiErrorMessage(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const body = err.response?.data;
  if (body && typeof body === "object" && body !== null && "message" in body) {
    const msg = (body as { message: unknown }).message;
    return typeof msg === "string" && msg.trim() !== "" ? msg : null;
  }
  return null;
}

export async function fetchPhilippineProvinces(): Promise<PhilippineLocationRow[]> {
  try {
    const { data } = await publicClient.get<ApiEnvelope<PhilippineLocationRow[]>>("/public/locations/provinces");
    if (!data.success) {
      throw new Error(data.message ?? "Could not load provinces.");
    }
    return data.data ?? [];
  } catch (e) {
    const fromApi = readApiErrorMessage(e);
    if (fromApi) throw new Error(fromApi);
    if (e instanceof Error) throw e;
    throw new Error("Could not load provinces.");
  }
}

export async function fetchPhilippineCities(provinceCode: string): Promise<PhilippineLocationRow[]> {
  try {
    const { data } = await publicClient.get<ApiEnvelope<PhilippineLocationRow[]>>(
      `/public/locations/provinces/${encodeURIComponent(provinceCode)}/cities`,
    );
    if (!data.success) {
      throw new Error(data.message ?? "Could not load cities for the selected province.");
    }
    return data.data ?? [];
  } catch (e) {
    const fromApi = readApiErrorMessage(e);
    if (fromApi) throw new Error(fromApi);
    if (e instanceof Error) throw e;
    throw new Error("Could not load cities for the selected province.");
  }
}

export async function fetchPhilippineBarangaysPage(
  cityCode: string,
  page = 1,
  perPage = 500,
): Promise<{ rows: PhilippineLocationRow[]; lastPage: number }> {
  try {
    const { data } = await publicClient.get<BarangaysPageBody>(
      `/public/locations/cities/${encodeURIComponent(cityCode)}/barangays`,
      { params: { per_page: perPage, page } },
    );
    if (!data.success) {
      throw new Error(data.message ?? "Could not load barangays for the selected city.");
    }
    const lastPage = data.meta?.last_page ?? 1;
    return { rows: data.data ?? [], lastPage };
  } catch (e) {
    const fromApi = readApiErrorMessage(e);
    if (fromApi) throw new Error(fromApi);
    if (e instanceof Error) throw e;
    throw new Error("Could not load barangays for the selected city.");
  }
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
