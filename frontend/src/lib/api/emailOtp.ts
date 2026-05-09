import { apiClient } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export async function sendEmailVerificationOtp(): Promise<{ expires_at: string | null; message: string; cooldown_seconds: number | null }> {
  const { data } = await apiClient.post<ApiEnvelope<{ expires_at: string | null; cooldown_seconds?: number | null }>>("/auth/email-otp/send");
  if (!data.success) {
    throw new Error(data.message ?? "Failed to send verification code.");
  }

  return {
    expires_at: data.data?.expires_at ?? null,
    cooldown_seconds: data.data?.cooldown_seconds ?? null,
    message: data.message ?? "Verification code sent.",
  };
}

export async function verifyEmailVerificationOtp(otp: string): Promise<{ user: AuthUser | null; message: string }> {
  const { data } = await apiClient.post<ApiEnvelope<{ user: AuthUser }>>("/auth/email-otp/verify", { otp });
  if (!data.success) {
    throw new Error(data.message ?? "Verification failed.");
  }

  return {
    user: data.data?.user ?? null,
    message: data.message ?? "Email verified successfully.",
  };
}

