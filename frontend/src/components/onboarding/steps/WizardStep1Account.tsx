"use client";

import PasswordRequirementsMeter from "@/components/auth/PasswordRequirementsMeter";
import { PhilippineLocationPicker } from "@/components/locations/PhilippineLocationPicker";
import { WizardCheckbox } from "@/components/onboarding/WizardCheckbox";
import { WizardDateInput } from "@/components/onboarding/WizardDateInput";
import { WizardFieldLabel } from "@/components/onboarding/WizardFieldLabel";
import { WizardQuestionnaireSection } from "@/components/onboarding/WizardQuestionnaireSection";
import { WizardStepIntro } from "@/components/onboarding/WizardStepIntro";
import type { Step1Form } from "@/components/onboarding/types";
import { wizardInput } from "@/components/onboarding/wizardStyles";
import { LegalLinkButton } from "@/components/legal/LegalLinkButton";
import { WIZARD_STEP_DESCRIPTIONS } from "@/lib/onboarding/labels";
import { wizardFieldIcons } from "@/lib/onboarding/wizardIcons";
import {
  sanitizeEmailTyping,
  sanitizePersonName,
  sanitizePhilippinesMobileInput,
} from "@/lib/inputRestrictions";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";

type Props = {
  form: Step1Form;
  onChange: (patch: Partial<Step1Form>) => void;
  hasPassword: boolean;
  fieldErrors: Record<string, string>;
};

export function WizardStep1Account({ form, onChange, hasPassword, fieldErrors }: Props) {
  const needsPassword = !hasPassword;

  return (
    <div className="space-y-4 sm:space-y-5">
      <WizardStepIntro step={1} description={WIZARD_STEP_DESCRIPTIONS[1]} />

      <WizardQuestionnaireSection
        number={1}
        icon={wizardFieldIcons.user}
        title="Who is the resort owner?"
        description="Legal name and identity details for verification."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <WizardFieldLabel icon={wizardFieldIcons.user}>Full name</WizardFieldLabel>
            <input
              className={wizardInput}
              value={form.name}
              onChange={(e) => onChange({ name: sanitizePersonName(e.target.value) })}
            />
            {fieldErrors.name ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p> : null}
          </div>
          <div>
            <WizardFieldLabel icon={wizardFieldIcons.calendar}>Birth date</WizardFieldLabel>
            <WizardDateInput
              value={form.birth_date}
              onChange={(e) => onChange({ birth_date: e.target.value })}
            />
            {fieldErrors.birth_date ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.birth_date}</p> : null}
          </div>
          <div>
            <WizardFieldLabel icon={wizardFieldIcons.tin}>Personal TIN</WizardFieldLabel>
            <input
              className={wizardInput}
              value={form.personal_tin}
              onChange={(e) => onChange({ personal_tin: e.target.value })}
              placeholder="Optional"
            />
          </div>
        </div>
      </WizardQuestionnaireSection>

      <WizardQuestionnaireSection
        number={2}
        icon={wizardFieldIcons.email}
        title="How can we reach you?"
        description="Used for login, OTP, and verification updates."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <WizardFieldLabel icon={wizardFieldIcons.email}>Email</WizardFieldLabel>
            <input
              type="email"
              className={wizardInput}
              value={form.email}
              onChange={(e) => onChange({ email: sanitizeEmailTyping(e.target.value) })}
            />
            {fieldErrors.email ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p> : null}
          </div>
          <div>
            <WizardFieldLabel icon={wizardFieldIcons.phone}>Mobile number</WizardFieldLabel>
            <input
              className={wizardInput}
              value={form.contact_number}
              onChange={(e) => onChange({ contact_number: sanitizePhilippinesMobileInput(e.target.value) })}
              placeholder="09XX XXX XXXX"
            />
            {fieldErrors.contact_number ? (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.contact_number}</p>
            ) : null}
          </div>
        </div>
      </WizardQuestionnaireSection>

      {needsPassword ? (
        <WizardQuestionnaireSection
          number={3}
          icon={wizardFieldIcons.lock}
          title="Secure your account"
          description="Create a password for email sign-in."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <WizardFieldLabel icon={wizardFieldIcons.lock}>Password</WizardFieldLabel>
              <input
                type="password"
                className={wizardInput}
                value={form.password}
                onChange={(e) => onChange({ password: e.target.value })}
              />
              <PasswordRequirementsMeter password={form.password} className="mt-2" />
            </div>
            <div>
              <WizardFieldLabel icon={wizardFieldIcons.lock}>Confirm password</WizardFieldLabel>
              <input
                type="password"
                className={wizardInput}
                value={form.password_confirmation}
                onChange={(e) => onChange({ password_confirmation: e.target.value })}
              />
            </div>
          </div>
          {form.password && !passwordPolicyMet(getPasswordPolicyChecks(form.password)) ? (
            <p className="text-xs text-amber-700">Password must meet all requirements above.</p>
          ) : null}
          {form.password_confirmation &&
          form.password &&
          form.password !== form.password_confirmation ? (
            <p className="text-xs text-rose-600">Passwords do not match.</p>
          ) : null}
          {fieldErrors.password_confirmation ? (
            <p className="text-xs text-rose-600">{fieldErrors.password_confirmation}</p>
          ) : null}
        </WizardQuestionnaireSection>
      ) : null}

      <WizardQuestionnaireSection
        number={needsPassword ? 4 : 3}
        icon={wizardFieldIcons.address}
        title="Owner mailing address"
        description="Official correspondence and verification records."
      >
        <PhilippineLocationPicker
          appearance="wizard"
          idPrefix="owner-mail"
          value={{
            provinceCode: form.owner_mailing_province_psgc,
            cityCode: form.owner_mailing_city_municipality_psgc,
            barangayName: form.owner_mailing_barangay_name,
          }}
          onChange={(loc) =>
            onChange({
              owner_mailing_province_psgc: loc.provinceCode,
              owner_mailing_city_municipality_psgc: loc.cityCode,
              owner_mailing_barangay_name: loc.barangayName,
            })
          }
          barangayRowEnd={
            <div className="flex-1">
              <WizardFieldLabel icon={wizardFieldIcons.address}>Street / unit</WizardFieldLabel>
              <input
                className={wizardInput}
                value={form.owner_mailing_street_line}
                onChange={(e) => onChange({ owner_mailing_street_line: e.target.value })}
              />
            </div>
          }
        />
        {fieldErrors.owner_mailing_street_line ? (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.owner_mailing_street_line}</p>
        ) : null}
      </WizardQuestionnaireSection>

      <WizardQuestionnaireSection
        number={needsPassword ? 5 : 4}
        icon={wizardFieldIcons.certify}
        title="Agreements & certification"
        description="Required to complete registration on Anti-Scam PH."
      >
        <div className="space-y-2">
          <WizardCheckbox
            checked={form.accept_terms}
            onChange={(e) => onChange({ accept_terms: e.target.checked })}
            label={
              <>
                I accept the <LegalLinkButton kind="terms">Terms & Conditions</LegalLinkButton> and{" "}
                <LegalLinkButton kind="privacy">Privacy Policy</LegalLinkButton>.
              </>
            }
          />
          <WizardCheckbox
            checked={form.accept_information_certification}
            onChange={(e) => onChange({ accept_information_certification: e.target.checked })}
            label="I certify that all information provided is true and accurate. False information may result in account suspension."
          />
          {fieldErrors.accept_information_certification ? (
            <p className="text-xs text-rose-600">{fieldErrors.accept_information_certification}</p>
          ) : null}
        </div>
      </WizardQuestionnaireSection>
    </div>
  );
}
