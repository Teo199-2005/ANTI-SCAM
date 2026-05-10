import { publicClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

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

export async function listPublicResorts(params?: { search?: string; perPage?: number; page?: number }) {
  const { data } = await apiClient.get<ApiEnvelope<PaginatedResponse<PublicResortListItem>>>(
    "/public/resorts",
    { params }
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
  const { data } = await apiClient.get<ApiEnvelope<AvailabilityResult>>(
    `/public/rooms/${roomId}/availability`,
    { params: { check_in_date: checkIn, check_out_date: checkOut } }
  );
  return data.data;
}
