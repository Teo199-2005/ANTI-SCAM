import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type RegistrationStatus = "incomplete" | "complete";

export type ResortRegistrationState = {
  registration_status: RegistrationStatus;
  onboarding_step: number;
  verification_status: string;
  draft: {
    current_step: number;
    payload: Record<string, unknown>;
    updated_at?: string | null;
  };
  user: Record<string, unknown>;
  resort_id: number | null;
  catalog: {
    hospitality_types: string[];
    amenity_groups: Record<string, string[]>;
    verification_methods: string[];
  };
};

export async function fetchResortRegistration(): Promise<ResortRegistrationState> {
  const { data } = await apiClient.get<ApiEnvelope<ResortRegistrationState>>("/resort-owner/registration");
  return data.data;
}

export async function saveRegistrationStep(
  step: number,
  body: Record<string, unknown>,
  options?: { draft?: boolean },
): Promise<ResortRegistrationState> {
  const { data } = await apiClient.patch<ApiEnvelope<ResortRegistrationState>>(
    `/resort-owner/registration/step/${step}`,
    body,
    { params: options?.draft ? { draft: 1 } : undefined },
  );
  return data.data;
}

export async function finishResortRegistration(): Promise<ResortRegistrationState> {
  const { data } = await apiClient.post<ApiEnvelope<ResortRegistrationState>>("/resort-owner/registration/finish");
  return data.data;
}

export async function uploadRegistrationLogo(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ApiEnvelope<{ logo_url: string }>>(
    "/resort-owner/registration/upload-logo",
    form,
  );
  return data.data.logo_url;
}

export async function uploadRegistrationRoomPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<ApiEnvelope<{ url: string }>>(
    "/resort-owner/registration/upload-room-photo",
    form,
  );
  return data.data.url;
}

export async function uploadVerificationDocument(
  documentType: string,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  await apiClient.post(`/resort-owner/registration/verification/${documentType}`, form);
}
