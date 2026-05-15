import { publicClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import type { ApiEnvelope } from "@/lib/api/types";
import axios from "axios";

// Re-map to publicClient since none of these endpoints require authentication.
const apiClient = publicClient;

export type PublicRoom = {
  id: number;
  name: string;
  code: string;
  capacity: number;
  /** Parallel bookable units for overlapping dates (defaults to 1). */
  units?: number;
  basePrice: number;
  /** Guest reservation fee in PHP (from system settings; present on room detail). */
  reservationFee?: number;
  amenities: string[];
  images?: { id: number; url: string; caption?: string | null }[];
  rules?: string | null;
  status: string;
};

export type PublicResort = {
  id: number;
  slug?: string;
  tenantId?: number;
  name: string;
  description: string | null;
  address: string | null;
  contactNumber: string | null;
  /** Public resort detail (by id or slug) — resort logo path when set. */
  logoUrl?: string | null;
  images?: { id: number; url: string; caption?: string | null }[];
  rooms: PublicRoom[];
};

export type PublicResortListItem = {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  contactNumber: string | null;
  activeRoomsCount: number;
  featuredRoomId: number | null;
  priceFrom?: number | null;
};

export type AvailabilityResult = {
  available: boolean;
  check_in_date: string;
  check_out_date: string;
};

export type RoomDetail = PublicRoom & {
  resort: {
    id: number;
    name: string;
    address: string | null;
    description: string | null;
    contactNumber: string | null;
  };
  images?: { id: number; url: string; caption?: string | null }[];
};

type PaginatedResponse<T> = {
  data: T[];
  meta?: { current_page: number; last_page: number; total: number; per_page: number };
  links?: Record<string, string | null>;
};

export async function listPublicResorts(params?: {
  search?: string;
  perPage?: number;
  page?: number;
  province_psgc?: string | null;
  city_municipality_psgc?: string | null;
}) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResponse<PublicResortListItem>>>(
    "/public/resorts",
    {
      params: {
        ...params,
        province_code: params?.province_psgc ?? undefined,
        city_code: params?.city_municipality_psgc ?? undefined,
        province_psgc: undefined,
        city_municipality_psgc: undefined,
      },
    },
  );
  return data.data;
}

export async function getPublicResort(id: number | string): Promise<PublicResort> {
  const { data } = await apiClient.get<ApiEnvelope<PublicResort>>(`/public/resorts/${id}`);
  return data.data;
}

export async function getPublicResortBySlug(slug: string): Promise<PublicResort> {
  const { data } = await apiClient.get<ApiEnvelope<PublicResort>>(`/public/resorts/slug/${slug}`);
  return data.data;
}

export async function getPublicRoom(roomId: number | string): Promise<RoomDetail> {
  const { data } = await apiClient.get<ApiEnvelope<RoomDetail>>(`/public/rooms/${roomId}`);
  return data.data;
}

export async function checkRoomAvailability(
  roomId: number,
  checkIn: string,
  checkOut: string
): Promise<AvailabilityResult> {
  const id = Number(roomId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid room.");
  }
  try {
    const res = await apiClient.get<ApiEnvelope<AvailabilityResult>>(`/public/rooms/${id}/availability`, {
      params: { check_in_date: checkIn, check_out_date: checkOut },
      validateStatus: () => true,
    });
    const body = res.data as ApiEnvelope<AvailabilityResult>;
    if (res.status >= 400) {
      const raw = body as unknown as { message?: string };
      const msg =
        typeof raw?.message === "string" && raw.message.trim() !== ""
          ? raw.message
          : `Availability check failed (${res.status}).`;
      throw new Error(msg);
    }
    if (!body?.success || body.data == null) {
      throw new Error(
        typeof body?.message === "string" && body.message.trim() !== ""
          ? body.message
          : "Availability check failed.",
      );
    }
    return body.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      throw new Error(parseApiErrorMessage(e, "Could not reach the availability service."));
    }
    throw e instanceof Error ? e : new Error("Availability check failed.");
  }
}
