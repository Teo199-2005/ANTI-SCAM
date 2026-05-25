"use client";

import { WizardFieldLabel } from "@/components/onboarding/WizardFieldLabel";
import { WizardQuestionnaireSection } from "@/components/onboarding/WizardQuestionnaireSection";
import { WizardStepIntro } from "@/components/onboarding/WizardStepIntro";
import { WizardSubtleIcon } from "@/components/onboarding/WizardSubtleIcon";
import type { Step5Form } from "@/components/onboarding/types";
import { wizardHint, wizardInput } from "@/components/onboarding/wizardStyles";
import { WIZARD_STEP_DESCRIPTIONS } from "@/lib/onboarding/labels";
import { wizardFieldIcons } from "@/lib/onboarding/wizardIcons";
import { CalendarDays } from "lucide-react";

type Props = {
  form: Step5Form;
  onChange: (patch: Partial<Step5Form>) => void;
  fieldErrors: Record<string, string>;
};

export function WizardStep5Pricing({ form, onChange, fieldErrors }: Props) {
  const updateRoom = (index: number, patch: Partial<Step5Form["rooms"][0]>) => {
    const rooms = form.rooms.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange({ rooms });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <WizardStepIntro step={5} description={WIZARD_STEP_DESCRIPTIONS[5]} />

      <WizardQuestionnaireSection
        number={1}
        title="Base rates per room"
        description="Weekday and weekend prices in Philippine pesos (PHP)."
      >
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3 text-xs text-slate-500">
          Holiday / peak pricing is coming soon — weekday and weekend rates apply for now.
        </div>

        <div className="space-y-4">
          {form.rooms.map((room, index) => (
            <div key={room.name + index} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <p className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0d1f3c]">
                <WizardSubtleIcon icon={wizardFieldIcons.rooms} size="sm" />
                {room.name || `Room ${index + 1}`}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <WizardFieldLabel icon={CalendarDays}>Weekday price (PHP)</WizardFieldLabel>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={wizardInput}
                    value={room.weekday_price}
                    onChange={(e) => updateRoom(index, { weekday_price: e.target.value })}
                  />
                </div>
                <div>
                  <WizardFieldLabel icon={wizardFieldIcons.pricing}>Weekend price (PHP)</WizardFieldLabel>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={wizardInput}
                    value={room.weekend_price}
                    onChange={(e) => updateRoom(index, { weekend_price: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {form.rooms.length === 0 ? <p className={wizardHint}>Add rooms in the previous step to set pricing.</p> : null}
        {fieldErrors.rooms ? <p className="text-xs text-rose-600">{fieldErrors.rooms}</p> : null}
        {fieldErrors.registration ? <p className="text-xs text-rose-600">{fieldErrors.registration}</p> : null}
      </WizardQuestionnaireSection>
    </div>
  );
}
