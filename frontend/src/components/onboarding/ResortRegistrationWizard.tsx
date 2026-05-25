"use client";

import { ResortRegistrationWizardModal } from "@/components/onboarding/ResortRegistrationWizardModal";
import { ResortRegistrationWizardShell } from "@/components/onboarding/ResortRegistrationWizardShell";
import { WIZARD_MODAL_MAX_H } from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import { ClipboardList, Loader2 } from "lucide-react";
import { WizardSubtleIcon } from "@/components/onboarding/WizardSubtleIcon";
import { WizardStep1Account } from "@/components/onboarding/steps/WizardStep1Account";
import { WizardStep2Business } from "@/components/onboarding/steps/WizardStep2Business";
import { WizardStep3Property } from "@/components/onboarding/steps/WizardStep3Property";
import { WizardStep4Rooms } from "@/components/onboarding/steps/WizardStep4Rooms";
import { WizardStep5Pricing } from "@/components/onboarding/steps/WizardStep5Pricing";
import { WizardStep6Verification } from "@/components/onboarding/steps/WizardStep6Verification";
import type { DraftRoom, Step1Form, Step2Form, Step3Form, Step4Form, Step5Form, Step6Form } from "@/components/onboarding/types";
import { useResortRegistrationWizard } from "@/components/onboarding/useResortRegistrationWizard";
import { useAuth } from "@/contexts/AuthContext";
import { uploadVerificationDocument } from "@/lib/api/resortRegistration";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";
import { validateStep6Form } from "@/lib/onboarding/validateStep6";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function formatOwnerMailingPreview(step1: Step1Form): string {
  return [step1.owner_mailing_street_line, step1.owner_mailing_barangay_name].filter(Boolean).join(", ");
}

function optionalUrl(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function buildStep3Body(step3: Step3Form): Record<string, unknown> {
  return {
    property_name: step3.property_name,
    hospitality_type: step3.hospitality_type,
    hospitality_type_other:
      step3.hospitality_type === "other" ? step3.hospitality_type_other.trim() || null : null,
    planned_room_count: step3.planned_room_count,
    description: step3.description.trim() || null,
    facebook_url: optionalUrl(step3.facebook_url),
    instagram_url: optionalUrl(step3.instagram_url),
    tiktok_url: optionalUrl(step3.tiktok_url),
    website_url: optionalUrl(step3.website_url),
    address_province_psgc: step3.address_province_psgc,
    address_city_municipality_psgc: step3.address_city_municipality_psgc,
    address_barangay_psgc: step3.address_barangay_psgc,
    address_barangay_name: step3.address_barangay_name,
    address_street_line: step3.address_street_line,
  };
}

function payloadStep<T>(payload: Record<string, unknown>, key: string): Partial<T> {
  const step = payload[key];
  return step && typeof step === "object" ? (step as Partial<T>) : {};
}

function draftRoomsFromPayload(step4: Record<string, unknown>): DraftRoom[] {
  const rooms = step4.rooms;
  if (!Array.isArray(rooms)) return [];
  return rooms.map((r, i) => {
    const room = r as Record<string, unknown>;
    return {
      clientId: String(room.clientId ?? `room-${i}`),
      name: String(room.name ?? ""),
      capacity: Number(room.capacity ?? 2),
      bed_count: room.bed_count != null ? Number(room.bed_count) : undefined,
      bed_type: room.bed_type != null ? String(room.bed_type) : undefined,
      check_in_time: room.check_in_time != null ? String(room.check_in_time) : undefined,
      check_out_time: room.check_out_time != null ? String(room.check_out_time) : undefined,
      amenities: Array.isArray(room.amenities) ? (room.amenities as string[]) : [],
      photo_urls: Array.isArray(room.photo_urls) ? (room.photo_urls as string[]) : [],
      weekday_price: room.weekday_price != null ? Number(room.weekday_price) : undefined,
      weekend_price: room.weekend_price != null ? Number(room.weekend_price) : undefined,
    };
  });
}

type Props = {
  initialStep?: number;
  verificationOnly?: boolean;
  onComplete?: () => void;
};

export function ResortRegistrationWizard({ initialStep = 1, verificationOnly, onComplete }: Props) {
  const { user, refreshUser } = useAuth();
  const wizard = useResortRegistrationWizard(initialStep);
  const {
    state,
    loading,
    step,
    setStep,
    saveStep,
    scheduleAutoSave,
    finish,
    saving,
    saveLabel,
    fieldErrors,
    error,
    progressPercent,
    setFieldErrors,
    setError,
    clearErrors,
  } = wizard;

  const userSnap = (state?.user ?? {}) as Record<string, unknown>;
  const payload = state?.draft.payload ?? {};

  const [step1, setStep1] = useState<Step1Form>({
    name: "",
    email: "",
    contact_number: "",
    birth_date: "",
    personal_tin: "",
    owner_mailing_province_psgc: null,
    owner_mailing_city_municipality_psgc: null,
    owner_mailing_barangay_psgc: null,
    owner_mailing_barangay_name: null,
    owner_mailing_street_line: "",
    password: "",
    password_confirmation: "",
    accept_terms: false,
    accept_privacy: true,
    accept_information_certification: false,
  });

  const [step2, setStep2] = useState<Step2Form>({
    no_registered_business: false,
    business_name: "",
    business_address: "",
    business_contact_number: "",
    business_tin: "",
    sec_dti_number: "",
  });

  const [step3, setStep3] = useState<Step3Form>({
    property_name: "",
    hospitality_type: "resort",
    hospitality_type_other: "",
    planned_room_count: 1,
    description: "",
    facebook_url: "",
    instagram_url: "",
    tiktok_url: "",
    website_url: "",
    address_province_psgc: null,
    address_city_municipality_psgc: null,
    address_barangay_psgc: null,
    address_barangay_name: null,
    address_street_line: "",
  });

  const [step4, setStep4] = useState<Step4Form>({
    logo_url: null,
    amenities: {},
    parking_enabled: false,
    parking_slots: 0,
    rooms: [],
  });

  const [step5, setStep5] = useState<Step5Form>({ rooms: [] });

  const [step6, setStep6] = useState<Step6Form>({
    verification_method: "video",
    stable_internet_acknowledged: false,
    government_id: null,
    property_tour: null,
    ownership_proof: null,
  });

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!state || hydratedRef.current) return;
    hydratedRef.current = true;

    const s1 = payloadStep<Step1Form>(payload, "step1");
    const s2 = payloadStep<Step2Form>(payload, "step2");
    const s3 = payloadStep<Step3Form>(payload, "step3");
    const s4raw = payloadStep<Record<string, unknown>>(payload, "step4");
    const s5 = payloadStep<Step5Form>(payload, "step5");

    setStep1((prev) => ({
      ...prev,
      name: String(s1.name ?? userSnap.name ?? user?.name ?? ""),
      email: String(s1.email ?? userSnap.email ?? user?.email ?? ""),
      contact_number: String(s1.contact_number ?? userSnap.phone ?? user?.phone ?? ""),
      birth_date: String(s1.birth_date ?? userSnap.birth_date ?? ""),
      personal_tin: String(s1.personal_tin ?? ""),
      owner_mailing_province_psgc:
        (s1.owner_mailing_province_psgc as string | null) ?? (userSnap.owner_mailing_province_psgc as string | null) ?? null,
      owner_mailing_city_municipality_psgc:
        (s1.owner_mailing_city_municipality_psgc as string | null) ??
        (userSnap.owner_mailing_city_municipality_psgc as string | null) ??
        null,
      owner_mailing_barangay_psgc:
        (s1.owner_mailing_barangay_psgc as string | null) ?? (userSnap.owner_mailing_barangay_psgc as string | null) ?? null,
      owner_mailing_barangay_name:
        (s1.owner_mailing_barangay_name as string | null) ?? (userSnap.owner_mailing_barangay_name as string | null) ?? null,
      owner_mailing_street_line: String(s1.owner_mailing_street_line ?? userSnap.owner_mailing_street_line ?? ""),
      accept_information_certification: Boolean(user?.terms_accepted_at) || Boolean(s1.accept_information_certification),
    }));

    setStep2((prev) => ({
      ...prev,
      ...s2,
      no_registered_business: Boolean(s2.no_registered_business),
      business_name: String(s2.business_name ?? ""),
      business_address: String(s2.business_address ?? ""),
      business_contact_number: String(s2.business_contact_number ?? ""),
      business_tin: String(s2.business_tin ?? ""),
      sec_dti_number: String(s2.sec_dti_number ?? ""),
    }));

    setStep3((prev) => ({
      ...prev,
      ...s3,
      property_name: String(s3.property_name ?? ""),
      hospitality_type: String(s3.hospitality_type ?? "resort"),
      hospitality_type_other: String(s3.hospitality_type_other ?? ""),
      planned_room_count: Number(s3.planned_room_count ?? 1),
      description: String(s3.description ?? ""),
      facebook_url: String(s3.facebook_url ?? ""),
      instagram_url: String(s3.instagram_url ?? ""),
      tiktok_url: String(s3.tiktok_url ?? ""),
      website_url: String(s3.website_url ?? ""),
      address_province_psgc: (s3.address_province_psgc as string | null) ?? null,
      address_city_municipality_psgc: (s3.address_city_municipality_psgc as string | null) ?? null,
      address_barangay_psgc: (s3.address_barangay_psgc as string | null) ?? null,
      address_barangay_name: (s3.address_barangay_name as string | null) ?? null,
      address_street_line: String(s3.address_street_line ?? ""),
    }));

    const rooms = draftRoomsFromPayload(s4raw);
    setStep4({
      logo_url: (s4raw.logo_url as string | null) ?? null,
      amenities: (s4raw.amenities as Record<string, string[]>) ?? {},
      parking_enabled: Boolean(s4raw.parking_enabled),
      parking_slots: Number(s4raw.parking_slots ?? 0),
      rooms: rooms.length ? rooms : [],
    });

    const pricingRooms =
      Array.isArray(s5.rooms) && s5.rooms.length
        ? (s5.rooms as Step5Form["rooms"])
        : rooms.map((r) => ({
            name: r.name,
            weekday_price: r.weekday_price != null ? String(r.weekday_price) : "",
            weekend_price: r.weekend_price != null ? String(r.weekend_price) : "",
          }));
    setStep5({ rooms: pricingRooms });

    if ((verificationOnly || state.registration_status === "complete") && state.resort_id) {
      setStep(6);
    }
  }, [state, payload, user, userSnap, verificationOnly, setStep]);

  const hasPassword = Boolean(userSnap.has_password);

  const buildStep1Body = useCallback((): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      name: step1.name,
      email: step1.email,
      contact_number: step1.contact_number,
      birth_date: step1.birth_date,
      personal_tin: step1.personal_tin || null,
      owner_mailing_province_psgc: step1.owner_mailing_province_psgc,
      owner_mailing_city_municipality_psgc: step1.owner_mailing_city_municipality_psgc,
      owner_mailing_barangay_psgc: step1.owner_mailing_barangay_psgc,
      owner_mailing_barangay_name: step1.owner_mailing_barangay_name,
      owner_mailing_street_line: step1.owner_mailing_street_line,
      accept_information_certification: step1.accept_information_certification,
      accept_terms: step1.accept_terms,
      accept_privacy: step1.accept_privacy,
    };
    if (step1.password) {
      body.password = step1.password;
      body.password_confirmation = step1.password_confirmation;
    }
    return body;
  }, [step1]);

  const buildStep4Body = useCallback((): Record<string, unknown> => {
    return {
      logo_url: step4.logo_url,
      amenities: step4.amenities,
      parking_enabled: step4.parking_enabled,
      parking_slots: step4.parking_slots,
      rooms: step4.rooms.map(({ clientId: _c, ...room }) => room),
    };
  }, [step4]);

  const buildStep5Body = useCallback((): Record<string, unknown> => {
    return {
      rooms: step5.rooms.map((r) => ({
        name: r.name,
        weekday_price: Number(r.weekday_price),
        weekend_price: Number(r.weekend_price),
      })),
    };
  }, [step5]);

  const buildStep3BodyMemo = useCallback(() => buildStep3Body(step3), [step3]);

  useEffect(() => {
    if (!state || saving) return;
    if (step === 2) scheduleAutoSave(2, { ...step2 });
    if (step === 3) scheduleAutoSave(3, buildStep3BodyMemo());
    if (step === 4) scheduleAutoSave(4, buildStep4Body());
    if (step === 5) scheduleAutoSave(5, buildStep5Body());
  }, [step, step2, step3, step4, step5, state, saving, scheduleAutoSave, buildStep3BodyMemo, buildStep4Body, buildStep5Body]);

  const handleNext = async () => {
    try {
      if (step === 1) {
        await saveStep(1, buildStep1Body(), { advance: true });
        await refreshUser();
      } else if (step === 2) {
        await saveStep(2, { ...step2 }, { advance: true });
      } else if (step === 3) {
        await saveStep(3, buildStep3Body(step3), { advance: true });
      } else if (step === 4) {
        const photos = step4.rooms.reduce((n, r) => n + (r.photo_urls?.length ?? 0), 0);
        if (step4.rooms.length < 1 || photos < 1 || step4.rooms.some((r) => !r.name.trim())) {
          const errs: Record<string, string> = {};
          if (step4.rooms.length < 1) errs.rooms = "Add at least one room.";
          else if (photos < 1) errs.rooms = "Upload at least 1 photo across your rooms.";
          else errs.rooms = "Each room needs a name.";
          setFieldErrors(errs);
          setError("Complete rooms and photos before continuing.");
          return;
        }
        await saveStep(4, buildStep4Body(), { advance: true });
        setStep5((prev) => ({
          rooms: step4.rooms.map((r) => {
            const existing = prev.rooms.find((p) => p.name === r.name);
            return {
              name: r.name,
              weekday_price: existing?.weekday_price ?? (r.weekday_price != null ? String(r.weekday_price) : ""),
              weekend_price: existing?.weekend_price ?? (r.weekend_price != null ? String(r.weekend_price) : ""),
            };
          }),
        }));
      } else if (step === 5) {
        await saveStep(5, buildStep5Body());
        await finish();
        await refreshUser();
        setStep(6);
      } else if (step === 6) {
        const step6Errors = validateStep6Form(step6);
        if (Object.keys(step6Errors).length > 0) {
          setFieldErrors(step6Errors);
          setError("Complete the required fields before submitting verification.");
          return;
        }
        clearErrors();
        if (!state?.resort_id) {
          if (state?.registration_status !== "complete") {
            await saveStep(5, buildStep5Body());
          }
          const finished = await finish();
          if (!finished.resort_id) {
            setError(
              "Your resort workspace is not set up yet. Go back to Pricing (step 5), save, then try again.",
            );
            return;
          }
        }
        for (const doc of [
          { type: "government_id", file: step6.government_id },
          { type: "property_tour", file: step6.property_tour },
          { type: "ownership_proof", file: step6.ownership_proof },
        ]) {
          if (doc.file) await uploadVerificationDocument(doc.type, doc.file);
        }
        await saveStep(6, {
          verification_method: step6.verification_method,
          stable_internet_acknowledged: step6.stable_internet_acknowledged,
        });
        await refreshUser();
        onComplete?.();
      }
    } catch {
      // errors surfaced via hook
    }
  };

  const nextDisabled = useMemo(() => {
    if (step === 1) {
      if (
        !step1.name ||
        !step1.email ||
        !step1.contact_number ||
        !step1.birth_date ||
        !step1.owner_mailing_province_psgc ||
        !step1.owner_mailing_city_municipality_psgc ||
        !step1.owner_mailing_barangay_name ||
        !step1.owner_mailing_street_line
      ) {
        return true;
      }
      if (!step1.accept_terms || !step1.accept_information_certification) return true;
      if (!hasPassword) {
        if (!step1.password || !passwordPolicyMet(getPasswordPolicyChecks(step1.password))) return true;
        if (step1.password !== step1.password_confirmation) return true;
      }
      return false;
    }
    if (step === 2 && !step2.no_registered_business) {
      return !step2.business_name || !step2.business_address || !step2.business_contact_number;
    }
    if (step === 3) {
      return (
        !step3.property_name ||
        !step3.hospitality_type ||
        (step3.hospitality_type === "other" && !step3.hospitality_type_other.trim()) ||
        !step3.address_province_psgc ||
        !step3.address_city_municipality_psgc ||
        !step3.address_barangay_name ||
        !step3.address_street_line
      );
    }
    if (step === 5) {
      return step5.rooms.some((r) => !r.weekday_price || !r.weekend_price);
    }
    return false;
  }, [step, step1, step2, step3, step4, step5, hasPassword]);

  if (loading) {
    return (
      <ResortRegistrationWizardModal>
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className={cn(
            "mx-auto flex w-full flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-8 py-14 shadow-2xl",
            WIZARD_MODAL_MAX_H,
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-clOcean/[0.08] ring-1 ring-clOcean/15">
            <WizardSubtleIcon icon={ClipboardList} size="lg" className="text-clOcean" />
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-[#0d1f3c]" aria-hidden />
          <p className="text-sm font-medium text-slate-700">Loading registration…</p>
        </div>
      </ResortRegistrationWizardModal>
    );
  }

  const nextLabel = step === 5 ? "Finish registration" : step === 6 ? "Submit verification" : "Next";
  const showBack = step > 1 && !(verificationOnly && step === 6);

  return (
    <ResortRegistrationWizardShell
      step={step}
      progressPercent={progressPercent}
      saveLabel={saveLabel}
      saving={saving}
      showBack={showBack}
      backDisabled={saving}
      onBack={() => setStep((s) => Math.max(1, s - 1))}
      onNext={() => void handleNext()}
      nextLabel={nextLabel}
      nextDisabled={nextDisabled}
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>
      ) : null}

      {step === 1 && !verificationOnly ? (
        <WizardStep1Account form={step1} onChange={(p) => setStep1((s) => ({ ...s, ...p }))} hasPassword={hasPassword} fieldErrors={fieldErrors} />
      ) : null}
      {step === 2 && !verificationOnly ? (
        <WizardStep2Business
          form={step2}
          ownerMailingPreview={formatOwnerMailingPreview(step1)}
          onChange={(p) => setStep2((s) => ({ ...s, ...p }))}
          fieldErrors={fieldErrors}
        />
      ) : null}
      {step === 3 && !verificationOnly ? (
        <WizardStep3Property
          form={step3}
          onChange={(p) => setStep3((s) => ({ ...s, ...p }))}
          hospitalityTypes={state?.catalog.hospitality_types ?? []}
          fieldErrors={fieldErrors}
        />
      ) : null}
      {step === 4 && !verificationOnly ? (
        <WizardStep4Rooms
          form={step4}
          onChange={(p) => setStep4((s) => ({ ...s, ...p }))}
          amenityGroups={state?.catalog.amenity_groups ?? {}}
          fieldErrors={fieldErrors}
        />
      ) : null}
      {step === 5 && !verificationOnly ? (
        <WizardStep5Pricing form={step5} onChange={(p) => setStep5((s) => ({ ...s, ...p }))} fieldErrors={fieldErrors} />
      ) : null}
      {step === 6 ? (
        <WizardStep6Verification
          form={step6}
          onChange={(p) => setStep6((s) => ({ ...s, ...p }))}
          verificationMethods={state?.catalog.verification_methods ?? []}
          fieldErrors={fieldErrors}
        />
      ) : null}
    </ResortRegistrationWizardShell>
  );
}
