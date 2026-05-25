import type { Step6Form } from "@/components/onboarding/types";

export function verificationNeedsInternetAck(method: string): boolean {
  return method === "video" || method === "hybrid";
}

export function validateStep6Form(form: Step6Form): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.verification_method) {
    errors.verification_method = "Select how we should verify your property.";
  }

  if (verificationNeedsInternetAck(form.verification_method) && !form.stable_internet_acknowledged) {
    errors.stable_internet_acknowledged =
      "Confirm stable internet is available for live or hybrid verification.";
  }

  if (!(form.government_id instanceof File)) {
    errors.government_id = "Upload a valid government ID.";
  }
  if (!(form.property_tour instanceof File)) {
    errors.property_tour = "Upload property tour photos or video.";
  }
  if (!(form.ownership_proof instanceof File)) {
    errors.ownership_proof = "Upload proof of ownership or authorization.";
  }

  return errors;
}
