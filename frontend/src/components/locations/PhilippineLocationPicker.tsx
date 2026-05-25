"use client";

import { AppSelect, FieldLabel, appFieldInput } from "@/components/shared/form";
import { wizardFieldIcons } from "@/lib/onboarding/wizardIcons";
import { normalizeProvinceCodeForDisplay } from "@/lib/locations/phLocationApiCache";
import { usePhilippineLocationDropdowns } from "@/lib/locations/usePhilippineLocationDropdowns";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export type PhilippineLocationValue = {
  provinceCode: string | null;
  cityCode: string | null;
  barangayName: string | null;
};

type Props = {
  value: PhilippineLocationValue;
  onChange: (next: PhilippineLocationValue) => void;
  disabled?: boolean;
  idPrefix?: string;
  legacyBarangayCodeHint?: boolean;
  barangayRowEnd?: ReactNode;
  /** `wizard` uses field labels with icons; `dashboard` uses standard labels. */
  appearance?: "dashboard" | "wizard";
  /** Select size preset */
  selectVariant?: "default" | "filter";
};

export function PhilippineLocationPicker({
  value,
  onChange,
  disabled,
  idPrefix = "ph-loc",
  legacyBarangayCodeHint,
  barangayRowEnd,
  appearance = "dashboard",
  selectVariant = "default",
}: Props) {
  const isWizard = appearance === "wizard";
  const selectVariantResolved = isWizard ? "default" : selectVariant;

  const displayProvinceCode = normalizeProvinceCodeForDisplay(value.provinceCode);

  const { provinces, cities, loadingProvinces, loadingCities, provincesError, citiesError } =
    usePhilippineLocationDropdowns(displayProvinceCode);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const v = valueRef.current;
    if (!v.provinceCode || !v.cityCode || cities.length === 0) return;
    if (!cities.some((c) => c.code === v.cityCode)) {
      onChangeRef.current({ ...v, cityCode: null });
    }
  }, [value.provinceCode, value.cityCode, cities]);

  const provinceSelectDisabled = Boolean(disabled || loadingProvinces);
  const citySelectDisabled = Boolean(disabled || loadingProvinces || !value.provinceCode || loadingCities);

  const onProvincePick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ provinceCode: c, cityCode: null, barangayName: value.barangayName });
  };

  const onCityPick = (code: string) => {
    const c = code === "" ? null : code;
    onChange({ ...value, cityCode: c });
  };

  const locationError = provincesError ?? citiesError;

  const provinceOptions = provinces.map((p) => ({ value: p.code, label: p.name }));
  const cityOptions = cities.map((c) => ({ value: c.code, label: c.name }));

  function LocationLabel({
    id,
    text,
    icon = wizardFieldIcons.location,
  }: {
    id: string;
    text: string;
    icon?: typeof wizardFieldIcons.location;
  }) {
    if (isWizard) {
      return (
        <FieldLabel icon={icon} htmlFor={id}>
          {text}
        </FieldLabel>
      );
    }
    return (
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-zinc-600">
        {text}
      </label>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <LocationLabel id={`${idPrefix}-prov`} text="Province / region" />
          <AppSelect
            id={`${idPrefix}-prov`}
            variant={selectVariantResolved}
            value={displayProvinceCode ?? ""}
            disabled={provinceSelectDisabled}
            loading={loadingProvinces}
            placeholder="Select province / region"
            options={provinceOptions}
            onChange={(e) => onProvincePick(e.target.value)}
          />
        </div>
        <div>
          <LocationLabel id={`${idPrefix}-city`} text="City / municipality" />
          <AppSelect
            id={`${idPrefix}-city`}
            variant={selectVariantResolved}
            value={value.cityCode ?? ""}
            disabled={citySelectDisabled}
            loading={loadingCities}
            placeholder={
              !value.provinceCode ? "Select province / region first" : "Select city / municipality"
            }
            options={cityOptions}
            onChange={(e) => onCityPick(e.target.value)}
          />
        </div>
      </div>
      {locationError ? (
        <p className="text-[11px] text-rose-600" role="alert">
          {locationError}
        </p>
      ) : (
        <p className={cn("text-[11px] leading-snug text-zinc-500", isWizard && "inline-flex items-start gap-1.5")}>
          {isWizard ? (
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden />
          ) : null}
          <span>
            For Metro Manila addresses, select{" "}
            <strong className="font-medium text-zinc-700">Metro Manila (NCR)</strong> as province / region, then pick
            your city.
            {loadingProvinces || loadingCities ? " Loading lists…" : ""}
          </span>
        </p>
      )}
      {barangayRowEnd ? (
        <div className="grid gap-3 md:grid-cols-2 md:items-start">
          <div className="min-w-0">
            <LocationLabel id={`${idPrefix}-brgy`} text="Barangay" icon={wizardFieldIcons.address} />
            <input
              id={`${idPrefix}-brgy`}
              type="text"
              className={isWizard ? appFieldInput : "dash-input"}
              placeholder="Enter barangay…"
              maxLength={180}
              value={value.barangayName ?? ""}
              disabled={disabled || !value.cityCode}
              autoComplete="address-level4"
              onChange={(e) => {
                const v = e.target.value;
                onChange({ ...value, barangayName: v === "" ? null : v });
              }}
            />
            {legacyBarangayCodeHint ? (
              <p className="mt-1 text-xs text-zinc-500">
                Your address used an older barangay code. Enter the barangay name above to confirm your location.
              </p>
            ) : null}
          </div>
          <div className="min-w-0">{barangayRowEnd}</div>
        </div>
      ) : (
        <div>
          <LocationLabel id={`${idPrefix}-brgy`} text="Barangay" icon={wizardFieldIcons.address} />
          <input
            id={`${idPrefix}-brgy`}
            type="text"
            className={isWizard ? appFieldInput : "dash-input"}
            placeholder="Enter barangay…"
            maxLength={180}
            value={value.barangayName ?? ""}
            disabled={disabled || !value.cityCode}
            autoComplete="address-level4"
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...value, barangayName: v === "" ? null : v });
            }}
          />
          {legacyBarangayCodeHint ? (
            <p className="mt-1 text-xs text-zinc-500">
              Your address used an older barangay code. Enter the barangay name above to confirm your location.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
