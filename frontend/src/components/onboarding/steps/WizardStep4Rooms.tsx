"use client";

import { WizardFieldLabel } from "@/components/onboarding/WizardFieldLabel";
import { WizardQuestionnaireSection } from "@/components/onboarding/WizardQuestionnaireSection";
import { WizardStepIntro } from "@/components/onboarding/WizardStepIntro";
import { WizardSubtleIcon } from "@/components/onboarding/WizardSubtleIcon";
import type { DraftRoom, Step4Form } from "@/components/onboarding/types";
import { WizardCheckbox } from "@/components/onboarding/WizardCheckbox";
import { WizardTimeInput } from "@/components/onboarding/WizardTimeInput";
import { wizardChoiceCard, wizardChoiceCardActive, wizardHint, wizardInput, wizardLabel } from "@/components/onboarding/wizardStyles";
import { Clock } from "lucide-react";
import { WIZARD_STEP_DESCRIPTIONS } from "@/lib/onboarding/labels";
import { wizardFieldIcons } from "@/lib/onboarding/wizardIcons";
import { uploadRegistrationLogo, uploadRegistrationRoomPhoto } from "@/lib/api/resortRegistration";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { AMENITY_LABELS } from "@/lib/onboarding/labels";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { amenityMeta } from "@/lib/roomPreviewDisplay";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  form: Step4Form;
  onChange: (patch: Partial<Step4Form>) => void;
  amenityGroups: Record<string, string[]>;
  fieldErrors: Record<string, string>;
};

function newRoom(): DraftRoom {
  return {
    clientId: crypto.randomUUID(),
    name: "",
    capacity: 2,
    bed_count: 1,
    amenities: [],
    photo_urls: [],
  };
}

export function WizardStep4Rooms({ form, onChange, amenityGroups, fieldErrors }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const toggleAmenity = (group: string, key: string) => {
    const current = form.amenities[group] ?? [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    onChange({ amenities: { ...form.amenities, [group]: next } });
  };

  const updateRoom = (clientId: string, patch: Partial<DraftRoom>) => {
    onChange({
      rooms: form.rooms.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)),
    });
  };

  const handleLogo = async (file: File) => {
    setUploading("logo");
    setUploadError(null);
    const localPreview = URL.createObjectURL(file);
    setLogoPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return localPreview;
    });
    try {
      const url = await uploadRegistrationLogo(file);
      onChange({ logo_url: url });
      setLogoPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err: unknown) {
      setUploadError(parseApiErrorMessage(err, "Logo upload failed. Try a JPG or PNG under 10MB."));
      setLogoPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setUploading(null);
    }
  };

  const logoDisplaySrc =
    logoPreviewUrl ?? (form.logo_url ? laravelPublicUrl(form.logo_url) : null);

  const handleRoomPhotos = async (clientId: string, files: FileList | null) => {
    if (!files?.length) return;
    setUploading(clientId);
    setUploadError(null);
    try {
      const room = form.rooms.find((r) => r.clientId === clientId);
      const urls = [...(room?.photo_urls ?? [])];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError("Each photo must be 10MB or smaller.");
          continue;
        }
        urls.push(await uploadRegistrationRoomPhoto(file));
      }
      updateRoom(clientId, { photo_urls: urls.slice(0, 20) });
    } catch (err: unknown) {
      setUploadError(parseApiErrorMessage(err, "Photo upload failed. Try JPG, PNG, or WEBP under 10MB."));
    } finally {
      setUploading(null);
    }
  };

  const totalPhotos = form.rooms.reduce((n, r) => n + (r.photo_urls?.length ?? 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      <WizardStepIntro step={4} description={WIZARD_STEP_DESCRIPTIONS[4]} />
      <p className={wizardHint}>
        Rooms you add here are created when you finish registration. You can add more rooms later in{" "}
        <strong>Dashboard → Rooms</strong> — those are managed separately and do not replace wizard rooms.
      </p>

      <WizardQuestionnaireSection
        number={1}
        icon={wizardFieldIcons.logo}
        title="Resort branding"
        description="Your logo appears on your booking page and guest emails."
      >
        <WizardFieldLabel icon={wizardFieldIcons.logo}>Resort logo</WizardFieldLabel>
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-sm text-zinc-600 hover:border-clOcean"
        >
          {uploading === "logo" && !logoDisplaySrc ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : logoDisplaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoDisplaySrc}
              alt="Resort logo preview"
              className="max-h-24 max-w-full rounded-lg object-contain"
            />
          ) : (
            <>
              <Upload className="h-6 w-6" />
              Drag or click to upload logo
            </>
          )}
        </button>
        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleLogo(f);
          }}
        />
        {uploadError && uploading === null ? (
          <p className="text-xs text-rose-600">{uploadError}</p>
        ) : null}
      </WizardQuestionnaireSection>

      <WizardQuestionnaireSection
        number={2}
        icon={wizardFieldIcons.amenities}
        title="Property amenities"
        description="Select what guests can expect across the resort."
      >
      {Object.entries(amenityGroups).map(([group, keys]) => (
        <div key={group}>
          <p className={`mb-2 capitalize ${wizardLabel}`}>{group} amenities</p>
          <div className="flex flex-wrap gap-2">
            {keys.map((key) => {
              const selected = (form.amenities[group] ?? []).includes(key);
              const label = AMENITY_LABELS[key] ?? key;
              const AmenityIcon = amenityMeta(label).icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleAmenity(group, key)}
                  className={cn(
                    "inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                    wizardChoiceCard,
                    "min-h-0 rounded-full py-1.5",
                    selected && wizardChoiceCardActive,
                  )}
                >
                  <AmenityIcon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <WizardCheckbox
        checked={form.parking_enabled}
        onChange={(e) => onChange({ parking_enabled: e.target.checked })}
        label={
          <span className="inline-flex flex-wrap items-center gap-2">
            Parking available
            {form.parking_enabled ? (
              <input
                type="number"
                min={0}
                className={`${wizardInput} !min-h-[36px] max-w-[100px] py-1.5`}
                value={form.parking_slots}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChange({ parking_slots: Number(e.target.value) || 0 })}
                placeholder="Slots"
              />
            ) : null}
          </span>
        }
      />
      </WizardQuestionnaireSection>

      <WizardQuestionnaireSection
        number={3}
        icon={wizardFieldIcons.rooms}
        title="Rooms & photos"
        description="Add at least one room and 1 photo (more photos optional, max 10MB each)."
      >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0d1f3c]">
            <WizardSubtleIcon icon={wizardFieldIcons.rooms} size="sm" className="text-clOcean/70" />
            Your rooms
          </p>
          <button
            type="button"
            onClick={() => onChange({ rooms: [...form.rooms, newRoom()] })}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-medium"
          >
            <Plus className="h-4 w-4 text-slate-400" strokeWidth={1.75} /> Add room
          </button>
        </div>

        {form.rooms.length === 0 ? (
          <p className={wizardHint}>Add at least one room to continue.</p>
        ) : null}

        {form.rooms.map((room, index) => (
          <div key={room.clientId} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#0d1f3c]">Room {index + 1}</p>
              <button
                type="button"
                onClick={() => onChange({ rooms: form.rooms.filter((r) => r.clientId !== room.clientId) })}
                className="text-rose-600"
                aria-label="Remove room"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <WizardFieldLabel icon={wizardFieldIcons.rooms}>Room name</WizardFieldLabel>
                <input
                  className={wizardInput}
                  value={room.name}
                  onChange={(e) => updateRoom(room.clientId, { name: e.target.value })}
                />
              </div>
              <div>
                <WizardFieldLabel icon={wizardFieldIcons.user}>Capacity (guests)</WizardFieldLabel>
                <input
                  type="number"
                  min={1}
                  className={wizardInput}
                  value={room.capacity}
                  onChange={(e) => updateRoom(room.clientId, { capacity: Number(e.target.value) || 1 })}
                />
              </div>
              <div>
                <WizardFieldLabel icon={Clock}>Check-in</WizardFieldLabel>
                <WizardTimeInput
                  value={room.check_in_time ?? "14:00"}
                  onChange={(e) => updateRoom(room.clientId, { check_in_time: e.target.value })}
                />
              </div>
              <div>
                <WizardFieldLabel icon={Clock}>Check-out</WizardFieldLabel>
                <WizardTimeInput
                  value={room.check_out_time ?? "12:00"}
                  onChange={(e) => updateRoom(room.clientId, { check_out_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <WizardFieldLabel icon={wizardFieldIcons.logo}>Photos</WizardFieldLabel>
              <div className="flex flex-wrap gap-2">
                {(room.photo_urls ?? []).map((url) => (
                  <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={laravelPublicUrl(url)}
                      alt="Room photo"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 bg-black/50 p-0.5 text-white"
                      onClick={() =>
                        updateRoom(room.clientId, {
                          photo_urls: (room.photo_urls ?? []).filter((u) => u !== url),
                        })
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 hover:border-clOcean/50">
                  {uploading === room.clientId ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-zinc-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleRoomPhotos(room.clientId, e.target.files)}
                  />
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className={cn("text-xs font-medium", totalPhotos >= 1 ? "text-emerald-700" : "text-amber-700")}>
        {totalPhotos} photo{totalPhotos === 1 ? "" : "s"} uploaded
        {totalPhotos < 1
          ? form.rooms.length === 0
            ? " — add a room first, then upload at least 1 photo."
            : " — upload at least 1 photo to continue (more are optional)."
          : " — minimum met; additional photos are optional."}
      </p>
      {uploadError ? <p className="text-xs text-rose-600">{uploadError}</p> : null}
      {fieldErrors.rooms ? <p className="text-xs text-rose-600">{fieldErrors.rooms}</p> : null}
      </WizardQuestionnaireSection>
    </div>
  );
}
