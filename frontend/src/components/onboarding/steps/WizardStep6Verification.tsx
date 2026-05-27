"use client";

import { WizardCheckbox } from "@/components/onboarding/WizardCheckbox";
import { WizardFieldLabel } from "@/components/onboarding/WizardFieldLabel";
import { WizardFilePreview } from "@/components/onboarding/WizardFilePreview";
import { WizardQuestionnaireSection } from "@/components/onboarding/WizardQuestionnaireSection";
import { WizardRadioGroup } from "@/components/onboarding/WizardRadioGroup";
import { WizardStepIntro } from "@/components/onboarding/WizardStepIntro";
import type { Step6Form } from "@/components/onboarding/types";
import { VERIFICATION_METHOD_LABELS, WIZARD_STEP_DESCRIPTIONS } from "@/lib/onboarding/labels";
import { verificationNeedsInternetAck } from "@/lib/onboarding/validateStep6";
import { wizardFieldIcons } from "@/lib/onboarding/wizardIcons";
import { cn } from "@/lib/utils";
import { FileUp, ShieldAlert } from "lucide-react";

const DOC_FIELDS: Array<{
  key: keyof Step6Form;
  errorKey: string;
  label: string;
}> = [
  { key: "government_id", errorKey: "government_id", label: "Valid government ID" },
  { key: "property_tour", errorKey: "property_tour", label: "Property tour video or photos" },
  { key: "ownership_proof", errorKey: "ownership_proof", label: "Proof of ownership or authorization" },
];

type Props = {
  form: Step6Form;
  onChange: (patch: Partial<Step6Form>) => void;
  verificationMethods: string[];
  fieldErrors: Record<string, string>;
};

export function WizardStep6Verification({ form, onChange, verificationMethods, fieldErrors }: Props) {
  const uploadedCount = DOC_FIELDS.filter(({ key }) => form[key] instanceof File).length;
  const needsInternetAck = verificationNeedsInternetAck(form.verification_method);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
        <strong>Note:</strong> Anti-ScamPH is an independent verification and booking platform. Your business remains independently owned and operated; we only verify legitimacy and facilitate bookings.
      </div>
      <WizardStepIntro step={6} description={WIZARD_STEP_DESCRIPTIONS[6]} />

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <p>Providing false documents or misrepresenting ownership may result in permanent account removal.</p>
      </div>

      <WizardQuestionnaireSection
        number={1}
        icon={wizardFieldIcons.verification}
        title="How should we verify your property?"
        description="Our team reviews submissions within 24–72 hours. Your listing stays hidden until verified."
      >
        <WizardRadioGroup
          name="verification_method"
          value={form.verification_method}
          onChange={(verification_method) => onChange({ verification_method })}
          options={verificationMethods.map((method) => ({
            value: method,
            label: VERIFICATION_METHOD_LABELS[method] ?? method,
          }))}
        />
      </WizardQuestionnaireSection>

      <WizardQuestionnaireSection
        number={2}
        icon={wizardFieldIcons.documents}
        title="Upload verification documents"
        description="All three documents are required before submission."
      >
        <p className={cn("text-xs font-semibold", uploadedCount === 3 ? "text-emerald-700" : "text-amber-800")}>
          {uploadedCount} / 3 required documents selected
        </p>

        {DOC_FIELDS.map(({ key, errorKey, label }) => {
          const file = form[key];
          const hasFile = file instanceof File;
          return (
            <div key={key}>
              <WizardFieldLabel icon={wizardFieldIcons.documents}>{label}</WizardFieldLabel>
              {hasFile ? (
                <div className="flex flex-wrap items-start gap-3">
                  <WizardFilePreview
                    file={file as File}
                    onClear={() => onChange({ [key]: null } as Partial<Step6Form>)}
                  />
                  <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:border-clOcean/50">
                    <FileUp className="h-4 w-4 text-zinc-400" />
                    Replace file
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className="hidden"
                      onChange={(e) => onChange({ [key]: e.target.files?.[0] ?? null } as Partial<Step6Form>)}
                    />
                  </label>
                </div>
              ) : (
                <label
                  className={cn(
                    "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm transition",
                    "border-slate-200/90 bg-white text-zinc-600 shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)] hover:border-clOcean/50 hover:bg-clOcean/[0.03]",
                  )}
                >
                  <FileUp className="h-5 w-5 shrink-0 text-zinc-400" />
                  Choose file (JPG, PNG, WEBP, PDF — max 10MB)
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                    onChange={(e) => onChange({ [key]: e.target.files?.[0] ?? null } as Partial<Step6Form>)}
                  />
                </label>
              )}
              {fieldErrors[errorKey] ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors[errorKey]}</p>
              ) : null}
            </div>
          );
        })}
      </WizardQuestionnaireSection>

      {needsInternetAck ? (
        <WizardQuestionnaireSection
          number={3}
          icon={wizardFieldIcons.internet}
          title="Final confirmation"
          description="Required for live or hybrid verification."
        >
          <WizardCheckbox
            checked={form.stable_internet_acknowledged}
            onChange={(e) => onChange({ stable_internet_acknowledged: e.target.checked })}
            label="I confirm stable internet is available for live video verification."
          />
          {fieldErrors.stable_internet_acknowledged ? (
            <p className="text-xs text-rose-600">{fieldErrors.stable_internet_acknowledged}</p>
          ) : null}
        </WizardQuestionnaireSection>
      ) : null}
    </div>
  );
}
