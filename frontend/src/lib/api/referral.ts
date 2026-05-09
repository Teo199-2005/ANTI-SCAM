import { publicClient } from "@/lib/api/client";
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
