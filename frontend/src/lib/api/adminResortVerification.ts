import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type VerificationQueueFilter =
  | "awaiting_review"
  | "verified"
  | "rejected"
  | "needs_documents"
  | "all";

export type VerificationQueueItem = {
  id: number;
  name: string;
  subdomain: string | null;
  verification_status: string;
  verification_method: string | null;
  verification_submitted_at: string | null;
  verified_at: string | null;
  is_publicly_listed: boolean;
  rooms_count: number;
};

export type VerificationDocument = {
  document_type: string;
  original_name: string | null;
  url: string;
  uploaded_at: string | null;
};

export type VerificationBusiness = {
  business_status: string | null;
  business_name: string | null;
  business_address: string | null;
  business_contact_number: string | null;
  business_tin: string | null;
  sec_dti_number: string | null;
};

export type VerificationAssignee = {
  id: number;
  name: string;
  email: string;
};

export type VerificationResortDetail = {
  id: number;
  tenant_id: number;
  name: string;
  subdomain: string | null;
  contact_number: string | null;
  logo_url: string | null;
  description: string | null;
  address_display: string | null;
  address_street_line: string | null;
  representative_name: string | null;
  representative_contact_number: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  website_url: string | null;
  verification_status: string;
  verification_method: string | null;
  verification_submitted_at: string | null;
  verified_at: string | null;
  is_publicly_listed: boolean;
  is_vip: boolean;
  rooms_count: number;
  room_photo_count: number;
  amenities_count: number;
  amenities: string[];
  hospitality_type: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  verification_rejection_reason?: string | null;
  verification_submission_count?: number;
  verification_assigned_to_user_id?: number | null;
  verification_admin_notes?: string | null;
  verification_scheduled_at?: string | null;
  verification_scheduled_notes?: string | null;
  verification_assignee?: VerificationAssignee | null;
};

export type VerificationDetail = {
  resort: VerificationResortDetail;
  owner: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    contact_number?: string | null;
  } | null;
  business: VerificationBusiness | null;
  registration: {
    property_name: string | null;
    planned_room_count: number | null;
    rooms_in_draft: number;
    rooms_priced: number;
  } | null;
  documents: VerificationDocument[];
  required_document_types: string[];
  missing_document_types: string[];
};

export type VerificationQueueStats = {
  awaiting_review: number;
  reviewers: VerificationAssignee[];
};

type QueueResponse = {
  data: VerificationQueueItem[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export async function getResortVerificationStats(): Promise<VerificationQueueStats> {
  const { data } = await apiClient.get<ApiEnvelope<VerificationQueueStats>>(
    "/admin/resort-verifications/stats",
  );
  return data.data;
}

export async function listResortVerifications(params: {
  filter?: VerificationQueueFilter;
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<QueueResponse> {
  const { data } = await apiClient.get<ApiEnvelope<QueueResponse>>("/admin/resort-verifications", {
    params: {
      filter: params.filter ?? "awaiting_review",
      search: params.search || undefined,
      page: params.page ?? 1,
      perPage: params.perPage ?? 15,
    },
  });
  return data.data;
}

export async function getResortVerificationDetail(resortId: number): Promise<VerificationDetail> {
  const { data } = await apiClient.get<ApiEnvelope<VerificationDetail>>(
    `/admin/resort-verifications/${resortId}`,
  );
  return data.data;
}

export async function approveResortVerification(
  resortId: number,
  body: { list_publicly?: boolean; reason?: string },
): Promise<void> {
  await apiClient.post(`/admin/resort-verifications/${resortId}/approve`, body);
}

export async function rejectResortVerification(
  resortId: number,
  body: { reason: string },
): Promise<void> {
  await apiClient.post(`/admin/resort-verifications/${resortId}/reject`, body);
}

export async function requestMoreVerificationDocuments(
  resortId: number,
  body: { reason: string },
): Promise<void> {
  await apiClient.post(`/admin/resort-verifications/${resortId}/request-documents`, body);
}

export async function updateResortVerificationReview(
  resortId: number,
  body: {
    verification_assigned_to_user_id?: number | null;
    verification_admin_notes?: string | null;
    verification_scheduled_at?: string | null;
    verification_scheduled_notes?: string | null;
  },
): Promise<VerificationDetail> {
  const { data } = await apiClient.patch<ApiEnvelope<VerificationDetail>>(
    `/admin/resort-verifications/${resortId}/review`,
    body,
  );
  return data.data;
}

export async function downloadVerificationDocumentsZip(resortId: number): Promise<void> {
  const { data, headers } = await apiClient.get<Blob>(
    `/admin/resort-verifications/${resortId}/documents.zip`,
    { responseType: "blob" },
  );
  const disposition = headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] ?? `verification-${resortId}.zip`;
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
