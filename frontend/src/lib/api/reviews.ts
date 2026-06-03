import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

// ── Types ──────────────────────────────────────────────────────────────────

export type ResortReviewItem = {
  id: number;
  rating: number;
  comment: string | null;
  user_name: string;
  created_at: string;
};

export type ResortReviewSummary = {
  average_rating: number | null;
  total_reviews: number;
  breakdown: Record<number, { count: number; percentage: number }>;
};

type ReviewListResponse = {
  data: ResortReviewItem[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

// ── Public endpoints (no auth) ─────────────────────────────────────────────

export async function getPublicResortReviews(
  resortId: number,
  page = 1,
  perPage = 10,
): Promise<ReviewListResponse> {
  const { data } = await apiClient.get<ApiEnvelope<ReviewListResponse>>(
    `/public/resorts/${resortId}/reviews`,
    { params: { page, perPage } },
  );
  return data.data;
}

export async function getPublicResortReviewSummary(
  resortId: number,
): Promise<ResortReviewSummary> {
  const { data } = await apiClient.get<ApiEnvelope<ResortReviewSummary>>(
    `/public/resorts/${resortId}/reviews/summary`,
  );
  return data.data;
}

// ── Authenticated endpoints ────────────────────────────────────────────────

export type SubmitReviewPayload = {
  reservation_id: number;
  rating: number;
  comment?: string;
};

export type SubmitReviewResponse = {
  id: number;
  resort_id: number;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
};

export async function submitResortReview(
  resortId: number,
  payload: SubmitReviewPayload,
): Promise<SubmitReviewResponse> {
  const { data } = await apiClient.post<ApiEnvelope<SubmitReviewResponse>>(
    `/resorts/${resortId}/reviews`,
    payload,
  );
  return data.data;
}

// ── Admin endpoints ────────────────────────────────────────────────────────

export type AdminReviewItem = {
  id: number;
  resort_id: number;
  resort_name: string | null;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  rating: number;
  comment: string | null;
  is_visible: boolean;
  created_at: string;
};

type AdminReviewListResponse = {
  data: AdminReviewItem[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export async function getAdminReviews(params: {
  search?: string;
  filter?: string;
  page?: number;
  perPage?: number;
}): Promise<AdminReviewListResponse> {
  const { data } = await apiClient.get<ApiEnvelope<AdminReviewListResponse>>(
    "/admin/reviews",
    { params },
  );
  return data.data;
}

export async function toggleAdminReviewVisibility(
  reviewId: number,
): Promise<{ id: number; is_visible: boolean }> {
  const { data } = await apiClient.patch<
    ApiEnvelope<{ id: number; is_visible: boolean }>
  >(`/admin/reviews/${reviewId}/visibility`);
  return data.data;
}
