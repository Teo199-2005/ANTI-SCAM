"use client";

import { PhilippineLocationPicker } from "@/components/locations/PhilippineLocationPicker";
import { WizardFieldLabel } from "@/components/onboarding/WizardFieldLabel";
import { WizardQuestionnaireSection } from "@/components/onboarding/WizardQuestionnaireSection";
import { WizardStepIntro } from "@/components/onboarding/WizardStepIntro";
import type { Step3Form } from "@/components/onboarding/types";
import { wizardChoiceCard, wizardChoiceCardActive, wizardHint, wizardInput } from "@/components/onboarding/wizardStyles";
import { HOSPITALITY_LABELS, WIZARD_STEP_DESCRIPTIONS } from "@/lib/onboarding/labels";
import { wizardFieldIcons } from "@/lib/onboarding/wizardIcons";
import { sanitizeBusinessOrResortName } from "@/lib/inputRestrictions";
import { cn } from "@/lib/utils";

type Props = {
  form: Step3Form;
  onChange: (patch: Partial<Step3Form>) => void;
  hospitalityTypes: string[];
  fieldErrors: Record<string, string>;
};

export function WizardStep3Property({ form, onChange, hospitalityTypes, fieldErrors }: Props) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <WizardStepIntro step={3} description={WIZARD_STEP_DESCRIPTIONS[3]} />

      <WizardQuestionnaireSection
        number={1}
        icon={wizardFieldIcons.property}
        title="What is your property called?"
        description="This name appears on your booking page and guest communications."
      >
        <WizardFieldLabel icon={wizardFieldIcons.property}>Property / resort name</WizardFieldLabel>
        <input
          className={wizardInput}
          value={form.property_name}
          onChange={(e) => onChange({ property_name: sanitizeBusinessOrResortName(e.target.value) })}
        />
        {fieldErrors.property_name ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.property_name}</p> : null}
      </WizardQuestionnaireSection>

      <WizardQuestionnaireSection
        number={2}
        icon={wizardFieldIcons.hospitality}
        title="What type of stay do you offer?"
        description="Choose the category that best describes your property."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {hospitalityTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ hospitality_type: type })}
              className={cn(
                wizardChoiceCard,
                form.hospitality_type === type && wizardChoiceCardActive,
              )}
            >
              {HOSPITALITY_LABELS[type] ?? type}
            </button>
          ))}
        </div>
        {fieldErrors.hospitality_type ? (
          <p className="mt-2 text-xs text-rose-600">{fieldErrors.hospitality_type}</p>
        ) : null}
        {form.hospitality_type === "other" ? (
          <div className="mt-4">
            <WizardFieldLabel icon={wizardFieldIcons.hospitality}>Describe your property type</WizardFieldLabel>
            <input
              className={wizardInput}
              value={form.hospitality_type_other}
              onChange={(e) => onChange({ hospitality_type_other: e.target.value })}
            />
          </div>
        ) : null}
        <div className="mt-4">
          <WizardFieldLabel icon={wizardFieldIcons.rooms}>How many rooms do you plan to list?</WizardFieldLabel>
          <input
            type="number"
            min={1}
            className={`${wizardInput} max-w-[140px]`}
            value={form.planned_room_count || ""}
            onChange={(e) => onChange({ planned_room_count: Number(e.target.value) || 0 })}
          />
        </div>
      </WizardQuestionnaireSection>

      <WizardQuestionnaireSection
        number={3}
        icon={wizardFieldIcons.social}
        title="Online presence"
        description="Optional links so guests can learn more about you."
        optional
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <WizardFieldLabel icon={wizardFieldIcons.social}>Facebook URL</WizardFieldLabel>
            <input className={wizardInput} value={form.facebook_url} onChange={(e) => onChange({ facebook_url: e.target.value })} />
          </div>
          <div>
            <WizardFieldLabel icon={wizardFieldIcons.social}>Instagram URL</WizardFieldLabel>
            <input className={wizardInput} value={form.instagram_url} onChange={(e) => onChange({ instagram_url: e.target.value })} />
          </div>
          <div>
            <WizardFieldLabel icon={wizardFieldIcons.social}>TikTok URL</WizardFieldLabel>
            <input className={wizardInput} value={form.tiktok_url} onChange={(e) => onChange({ tiktok_url: e.target.value })} />
          </div>
          <div>
            <WizardFieldLabel icon={wizardFieldIcons.social}>Website</WizardFieldLabel>
            <input className={wizardInput} value={form.website_url} onChange={(e) => onChange({ website_url: e.target.value })} />
          </div>
        </div>
        <div>
          <WizardFieldLabel icon={wizardFieldIcons.property}>Short description</WizardFieldLabel>
          <textarea
            className={`${wizardInput} min-h-[100px] resize-none`}
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What makes your stay special?"
          />
        </div>
      </WizardQuestionnaireSection>

      <WizardQuestionnaireSection
        number={4}
        icon={wizardFieldIcons.location}
        title="Where is the property located?"
        description="Guests use this for directions and local search."
      >
        <PhilippineLocationPicker
          appearance="wizard"
          idPrefix="resort-addr"
          value={{
            provinceCode: form.address_province_psgc,
            cityCode: form.address_city_municipality_psgc,
            barangayName: form.address_barangay_name,
          }}
          onChange={(loc) =>
            onChange({
              address_province_psgc: loc.provinceCode,
              address_city_municipality_psgc: loc.cityCode,
              address_barangay_name: loc.barangayName,
            })
          }
          barangayRowEnd={
            <div className="flex-1">
              <WizardFieldLabel icon={wizardFieldIcons.address}>Street / landmark</WizardFieldLabel>
              <input
                className={wizardInput}
                value={form.address_street_line}
                onChange={(e) => onChange({ address_street_line: e.target.value })}
              />
            </div>
          }
        />
        {fieldErrors.address_street_line ? (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.address_street_line}</p>
        ) : null}
      </WizardQuestionnaireSection>
    </div>
  );
}
