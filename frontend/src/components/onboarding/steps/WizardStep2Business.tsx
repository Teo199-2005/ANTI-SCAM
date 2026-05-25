"use client";

import { WizardCheckbox } from "@/components/onboarding/WizardCheckbox";
import { WizardFieldLabel } from "@/components/onboarding/WizardFieldLabel";
import { WizardQuestionnaireSection } from "@/components/onboarding/WizardQuestionnaireSection";
import { WizardStepIntro } from "@/components/onboarding/WizardStepIntro";
import type { Step2Form } from "@/components/onboarding/types";
import { wizardInput } from "@/components/onboarding/wizardStyles";
import { WIZARD_STEP_DESCRIPTIONS } from "@/lib/onboarding/labels";
import { wizardFieldIcons } from "@/lib/onboarding/wizardIcons";
import { sanitizeBusinessOrResortName, sanitizePhilippinesMobileInput } from "@/lib/inputRestrictions";

type Props = {
  form: Step2Form;
  onChange: (patch: Partial<Step2Form>) => void;
  fieldErrors: Record<string, string>;
  /** Street + barangay from step 1 — offered as a quick fill for business address. */
  ownerMailingPreview?: string;
};

export function WizardStep2Business({ form, onChange, fieldErrors, ownerMailingPreview }: Props) {
  const registered = !form.no_registered_business;

  return (
    <div className="space-y-4 sm:space-y-5">
      <WizardStepIntro step={2} description={WIZARD_STEP_DESCRIPTIONS[2]} />

      <WizardQuestionnaireSection
        number={1}
        icon={wizardFieldIcons.businessStatus}
        title="Is your business registered?"
        description="DTI or SEC registration helps guests trust your listing."
      >
        <WizardCheckbox
          checked={form.no_registered_business}
          onChange={(e) =>
            onChange({
              no_registered_business: e.target.checked,
            })
          }
          label="I do not have a registered business (DTI/SEC)"
        />
        {registered ? (
          <p className="mt-2 text-xs text-zinc-500">Fill in your registered business details below, or check the box above if you are not registered.</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">You can continue without registered business details.</p>
        )}
      </WizardQuestionnaireSection>

      {registered ? (
        <WizardQuestionnaireSection
          number={2}
          icon={wizardFieldIcons.business}
          title="Registered business details"
          description="As shown on your DTI or SEC documents."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <WizardFieldLabel icon={wizardFieldIcons.business} required>
                Business name
              </WizardFieldLabel>
              <input
                className={wizardInput}
                value={form.business_name}
                onChange={(e) => onChange({ business_name: sanitizeBusinessOrResortName(e.target.value) })}
              />
              {fieldErrors.business_name ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.business_name}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <WizardFieldLabel icon={wizardFieldIcons.address} required className="mb-0">
                  Business address
                </WizardFieldLabel>
                {ownerMailingPreview ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-clOcean underline decoration-clOcean/30 underline-offset-2 hover:text-clOceanHover"
                    onClick={() => onChange({ business_address: ownerMailingPreview })}
                  >
                    Use owner mailing address
                  </button>
                ) : null}
              </div>
              <textarea
                className={`${wizardInput} min-h-[88px] resize-none`}
                value={form.business_address}
                placeholder="Building, street, barangay, city, province"
                onChange={(e) => onChange({ business_address: e.target.value })}
              />
              {fieldErrors.business_address ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.business_address}</p>
              ) : null}
            </div>
            <div>
              <WizardFieldLabel icon={wizardFieldIcons.phone} required>
                Business contact
              </WizardFieldLabel>
              <input
                className={wizardInput}
                value={form.business_contact_number}
                onChange={(e) => onChange({ business_contact_number: sanitizePhilippinesMobileInput(e.target.value) })}
              />
              {fieldErrors.business_contact_number ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.business_contact_number}</p>
              ) : null}
            </div>
            <div>
              <WizardFieldLabel icon={wizardFieldIcons.tin}>Business TIN</WizardFieldLabel>
              <input
                className={wizardInput}
                value={form.business_tin}
                onChange={(e) => onChange({ business_tin: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="sm:col-span-2">
              <WizardFieldLabel icon={wizardFieldIcons.certify}>SEC / DTI number</WizardFieldLabel>
              <input
                className={wizardInput}
                value={form.sec_dti_number}
                onChange={(e) => onChange({ sec_dti_number: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
        </WizardQuestionnaireSection>
      ) : null}
    </div>
  );
}
