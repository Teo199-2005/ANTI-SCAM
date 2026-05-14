import { apiClient, publicClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type ReadinessPayload = {
  is_ready: boolean;
  missing_fields: string[];
};

export type ReferralValidateResult =
  | { valid: true; code: string; marketer_name: string; readiness: ReadinessPayload | null }
  | { valid: false; message: string };

export async function validateReferralCode(code: string, resortId: number): Promise<ReferralValidateResult> {
  const { data } = await publicClient.post<ApiEnvelope<ReferralValidateResult>>("/public/referrals/validate", {
    code: code.trim().toUpperCase(),
    resort_id: resortId,
  });
  return data.data;
}

/** Dashboard (authenticated): one round-trip; server resolves the owner resort. */
export async function validateReferralCodeAsOwner(code: string): Promise<ReferralValidateResult> {
  const { data } = await apiClient.post<ApiEnvelope<ReferralValidateResult>>("/resort-owner/referrals/validate", {
    code: code.trim().toUpperCase(),
  });
  return data.data;
}

/** Validate a marketer code before signup (no resort scope; `readiness` is null). */
export async function validateReferralCodePublic(code: string): Promise<ReferralValidateResult> {
  const { data } = await publicClient.post<ApiEnvelope<ReferralValidateResult>>("/public/referrals/validate", {
    code: code.trim().toUpperCase(),
  });
  return data.data;
}
