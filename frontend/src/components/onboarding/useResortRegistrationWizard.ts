"use client";

import type { ResortRegistrationState } from "@/lib/api/resortRegistration";
import {
  fetchResortRegistration,
  finishResortRegistration,
  saveRegistrationStep,
} from "@/lib/api/resortRegistration";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_SAVE_MS = 800;

export function useResortRegistrationWizard(initialStep: number) {
  const [step, setStep] = useState(initialStep);
  const [state, setState] = useState<ResortRegistrationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSave = useRef<{ step: number; body: Record<string, unknown> } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchResortRegistration();
      setState(data);
      let resume = Math.max(1, Math.min(6, data.onboarding_step || data.draft.current_step || 1));
      if (data.registration_status !== "complete" && resume >= 6) {
        resume = 5;
      }
      const mustCompleteVerification =
        data.registration_status === "complete" &&
        data.resort_id &&
        (data.verification_status === "pending" ||
          data.verification_status === "rejected" ||
          data.verification_status === "needs_documents");
      if (mustCompleteVerification) {
        setStep(6);
      } else {
        setStep(resume);
      }
    } catch (err: unknown) {
      setError(parseApiErrorMessage(err, "Could not load registration."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const progressPercent = Math.round((step / 6) * 100);

  const applyFieldErrors = (err: unknown) => {
    const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]> } } };
    const errors = axiosErr.response?.data?.errors;
    if (errors && typeof errors === "object") {
      const mapped: Record<string, string> = {};
      for (const [key, messages] of Object.entries(errors)) {
        mapped[key] = Array.isArray(messages) ? messages[0] : String(messages);
      }
      setFieldErrors(mapped);
      setError(mapped.registration ?? mapped.step ?? Object.values(mapped)[0] ?? "Validation failed.");
      return;
    }
    setFieldErrors({});
    setError(parseApiErrorMessage(err, "Could not save this step."));
  };

  const saveStep = useCallback(
    async (
      targetStep: number,
      body: Record<string, unknown>,
      options?: { advance?: boolean; draft?: boolean; silent?: boolean },
    ) => {
      const isDraft = options?.draft ?? false;
      const silent = options?.silent ?? false;

      if (!silent) {
        setSaving(true);
        setSaveLabel("Saving…");
        setFieldErrors({});
        setError(null);
      }
      try {
        const data = await saveRegistrationStep(targetStep, body, { draft: isDraft });
        setState(data);
        if (!silent) {
          setSaveLabel("Saved");
          window.setTimeout(() => setSaveLabel(null), 2000);
        }
        if (options?.advance) {
          setStep((s) => Math.min(6, Math.max(s, targetStep) + 1));
        }
        return data;
      } catch (err: unknown) {
        if (!silent) {
          applyFieldErrors(err);
        }
        throw err;
      } finally {
        if (!silent) {
          setSaving(false);
        }
      }
    },
    [],
  );

  const scheduleAutoSave = useCallback(
    (targetStep: number, body: Record<string, unknown>) => {
      pendingAutoSave.current = { step: targetStep, body };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const pending = pendingAutoSave.current;
        if (!pending) return;
        void saveStep(pending.step, pending.body, { draft: true, silent: true }).catch(() => undefined);
      }, AUTO_SAVE_MS);
    },
    [saveStep],
  );

  const finish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const data = await finishResortRegistration();
      setState(data);
      setStep(6);
      return data;
    } catch (err: unknown) {
      applyFieldErrors(err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  useEffect(() => {
    setFieldErrors({});
    setError(null);
  }, [step]);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setError(null);
  }, []);

  return {
    step,
    setStep,
    state,
    loading,
    saving,
    saveLabel,
    fieldErrors,
    error,
    progressPercent,
    load,
    saveStep,
    scheduleAutoSave,
    finish,
    setError,
    setFieldErrors,
    clearErrors,
  };
}
