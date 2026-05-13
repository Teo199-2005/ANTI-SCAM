"use client";

import { RoomPhotosPanel } from "@/components/dashboard/RoomPhotosPanel";
import {
  AlignLeft,
  CircleDollarSign,
  Hash,
  Image as ImageIcon,
  Layers,
  ScrollText,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { sanitizeLongText, sanitizeRoomNameInput } from "@/lib/inputRestrictions";
import {
  displayInclusionLabel,
  encodeCustomInclusion,
  splitCustomInclusionInput,
  STANDARD_INCLUSION_OPTIONS,
} from "@/lib/roomInclusions";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type RoomFormValues = {
  resort_id: number;
  name: string;
  capacity: number;
  /** Identical bookable units (parallel bookings for overlapping dates). */
  units: number;
  base_price: number;
  bed_count: number;
  bed_type: string;
  inclusions: string[];
  /** When true, lines in custom_inclusions_text are saved as prefixed custom inclusion tokens. */
  custom_inclusions_enabled: boolean;
  custom_inclusions_text: string;
  amenities: string[];
  rules: string;
  status: "active" | "inactive" | "maintenance";
};

type Tab = "details" | "images";

type RoomModalProps = {
  open: boolean;
  title: string;
  initialValues: RoomFormValues;
  loading: boolean;
  /** Set after the room row is created so the Photos tab can upload images (API requires a room id). */
  roomId?: number;
  /** When the modal opens or after save, which tab to show (e.g. switch to photos after create). */
  initialActiveTab?: Tab;
  /** Label for the details form submit button (e.g. after create vs first save). */
  detailsSubmitLabel?: string;
  onClose: () => void;
  onSave: (values: RoomFormValues) => Promise<void>;
};

export default function RoomModal({
  open,
  title,
  initialValues,
  loading,
  roomId,
  initialActiveTab = "details",
  detailsSubmitLabel = "Save & continue to photos",
  onClose,
  onSave,
}: RoomModalProps) {
  const [form, setForm] = useState<RoomFormValues>(initialValues);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>("details");
  const prevOpenRef = useRef(false);
  const prevRoomIdForTabRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setForm(initialValues);
      setTab(initialActiveTab);
    }
    prevOpenRef.current = open;
  }, [open, initialValues, initialActiveTab]);

  useEffect(() => {
    if (!open) {
      prevRoomIdForTabRef.current = undefined;
      return;
    }
    const before = prevRoomIdForTabRef.current;
    prevRoomIdForTabRef.current = roomId;
    if (before === undefined && roomId !== undefined && initialActiveTab === "images") {
      setTab("images");
    }
  }, [open, roomId, initialActiveTab]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => setVisible(true), 10);
      return () => window.clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const updateField = <K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => {
    let next = value;
    if (key === "name" && typeof value === "string") next = sanitizeRoomNameInput(value) as RoomFormValues[K];
    if (key === "bed_type" && typeof value === "string") {
      next = sanitizeRoomNameInput(value, 80) as RoomFormValues[K];
    }
    if (key === "rules" && typeof value === "string") next = sanitizeLongText(value) as RoomFormValues[K];
    if (key === "custom_inclusions_text" && typeof value === "string") {
      next = sanitizeLongText(value, 2000) as RoomFormValues[K];
    }
    setForm((prev) => ({ ...prev, [key]: next }));
  };

  const inputWrap =
    "group relative rounded-xl border border-softBorder bg-white/95 transition focus-within:border-skyBlue focus-within:ring-2 focus-within:ring-skyBlue/20";
  const iconCls =
    "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 transition group-focus-within:text-skyBlue";
  const inputCls =
    "h-11 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-base text-zinc-800 placeholder:text-zinc-400 focus:outline-none md:text-sm";
  const fieldLabelCls = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500";

  return createPortal(
    <div
      role="presentation"
      className={`fixed inset-0 z-[120] flex items-end justify-center overflow-x-hidden overflow-y-auto overscroll-y-contain p-0 transition-all duration-200 motion-reduce:transition-none md:items-center md:p-4 ${visible ? "bg-zinc-900/55 backdrop-blur-md" : "bg-zinc-900/0"}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`box-border flex max-h-[min(88dvh,900px)] w-full min-w-0 max-w-2xl flex-col overflow-hidden border border-white/45 bg-white/90 shadow-float backdrop-blur-xl backdrop-saturate-150 transition-all duration-200 motion-reduce:transform-none motion-reduce:transition-none max-md:max-w-full max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 md:max-h-[min(90vh,800px)] md:rounded-2xl md:border ${visible ? "translate-y-0 opacity-100 md:scale-100" : "translate-y-4 opacity-0 md:translate-y-0 md:scale-95"}`}
      >
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/80 px-4 py-3 max-md:pt-[max(0.75rem,env(safe-area-inset-top))] md:px-6 md:py-4">
          <h3 className="min-w-0 pr-2 font-dash text-base font-semibold leading-snug text-navy md:pr-0 md:text-xl">{title}</h3>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-white/50 bg-white/60 text-zinc-500 transition hover:bg-white hover:text-navy md:h-9 md:w-9 md:min-h-0 md:min-w-0"
            onClick={onClose}
            aria-label="Close room modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs: Photos appears after the room is saved (room id required for uploads). */}
        {roomId ? (
          <div className="flex shrink-0 overflow-x-auto overflow-y-hidden border-b border-zinc-200/80 px-4 [-ms-overflow-style:none] [scrollbar-width:none] md:px-6 [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-min whitespace-nowrap">
            {(["details", "images"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`shrink-0 px-3 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px md:px-4 md:py-3 md:text-sm ${
                  tab === t
                    ? "border-skyBlue text-skyBlue"
                    : "border-transparent text-zinc-500 hover:text-navy"
                }`}
              >
                {t === "images" ? <span className="inline-flex items-center gap-1.5"><ImageIcon size={13} />Photos (up to 5)</span> : "Details"}
              </button>
            ))}
            </div>
          </div>
        ) : null}

        {/* Details tab */}
        {tab === "details" && (
          <form
            className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:space-y-3 md:p-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave(form);
            }}
          >
            <div>
              <p className={fieldLabelCls}>Room name</p>
              <label className={inputWrap}>
                <AlignLeft size={15} className={iconCls} />
                <input
                  className={inputCls}
                  placeholder="e.g. Deluxe Ocean View"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className={fieldLabelCls}>Capacity</p>
                <label className={inputWrap}>
                  <UserRound size={15} className={iconCls} />
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={50}
                    placeholder="e.g. 2"
                    value={form.capacity}
                    onChange={(e) => updateField("capacity", Number(e.target.value))}
                    required
                  />
                </label>
              </div>
              <div>
                <p className={fieldLabelCls}>Units</p>
                <label className={inputWrap}>
                  <Layers size={15} className={iconCls} />
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={99}
                    title="How many identical rooms of this type can be booked on the same dates"
                    placeholder="e.g. 1"
                    value={form.units}
                    onChange={(e) => updateField("units", Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                    required
                  />
                </label>
                <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                  Parallel bookings for overlapping dates (same room type).
                </p>
              </div>
              <div>
                <p className={fieldLabelCls}>Base price</p>
                <label className={inputWrap}>
                  <CircleDollarSign size={15} className={iconCls} />
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="e.g. 3500"
                    value={form.base_price}
                    onChange={(e) => updateField("base_price", Number(e.target.value))}
                    required
                  />
                </label>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className={fieldLabelCls}>Bed count</p>
                <label className={inputWrap}>
                  <Hash size={15} className={iconCls} />
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    max={20}
                    placeholder="e.g. 1"
                    value={form.bed_count}
                    onChange={(e) => updateField("bed_count", Number(e.target.value))}
                    required
                  />
                </label>
              </div>
              <div>
                <p className={fieldLabelCls}>Bed type</p>
                <label className={inputWrap}>
                  <AlignLeft size={15} className={iconCls} />
                  <select
                    className={`${inputCls} appearance-none`}
                    value={form.bed_type}
                    onChange={(e) => updateField("bed_type", e.target.value)}
                  >
                    <option value="Single">Single bed</option>
                    <option value="Double">Double bed</option>
                    <option value="Queen">Queen bed</option>
                    <option value="King">King bed</option>
                    <option value="Bunk Bed">Bunk bed</option>
                    <option value="Mixed">Mixed bed types</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="rounded-xl border border-softBorder bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Inclusions</p>
              <p className="mb-2 text-[11px] leading-snug text-zinc-500">
                Don&apos;t see yours? Check &quot;Custom inclusion&quot; below and type your own — it appears with a star
                icon on your listing.
              </p>
              <div className="flex flex-wrap gap-2">
                {STANDARD_INCLUSION_OPTIONS.map((item) => {
                  const checked = form.inclusions.includes(item);
                  return (
                    <label
                      key={item}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        checked
                          ? "border-skyBlue/50 bg-skyBlue/10 text-skyBlue"
                          : "border-softBorder bg-softGray/30 text-zinc-600 hover:bg-softGray/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-softBorder accent-skyBlue"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateField("inclusions", [...form.inclusions, item]);
                          } else {
                            updateField("inclusions", form.inclusions.filter((v) => v !== item));
                          }
                        }}
                      />
                      {item}
                    </label>
                  );
                })}
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-softBorder bg-softGray/20 px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-softBorder accent-skyBlue"
                  checked={form.custom_inclusions_enabled}
                  onChange={(e) => updateField("custom_inclusions_enabled", e.target.checked)}
                />
                <span>
                  <span className="font-semibold text-zinc-800">Custom inclusion</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                    Add labels not in the list (one per line). Shown with a{" "}
                    <Star size={10} className="inline-block align-[-0.1em] text-amber-500" aria-hidden /> star icon.
                  </span>
                </span>
              </label>
              {form.custom_inclusions_enabled ? (
                <div className="mt-2">
                  <label htmlFor="room-modal-custom-inclusions" className={fieldLabelCls}>
                    Your inclusion labels
                  </label>
                  <textarea
                    id="room-modal-custom-inclusions"
                    rows={3}
                    className="mt-1 w-full resize-y rounded-xl border border-softBorder bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-skyBlue focus:outline-none focus:ring-2 focus:ring-skyBlue/20"
                    placeholder={"e.g. Kayak rental\nOutdoor kitchen"}
                    value={form.custom_inclusions_text}
                    onChange={(e) => updateField("custom_inclusions_text", e.target.value)}
                    autoComplete="off"
                  />
                  {splitCustomInclusionInput(form.custom_inclusions_text).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {splitCustomInclusionInput(form.custom_inclusions_text).map((line, idx) => {
                        const token = encodeCustomInclusion(line);
                        if (!token) return null;
                        return (
                          <span
                            key={`cust-${idx}-${token}`}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/90 px-2 py-0.5 text-[11px] font-medium text-amber-950"
                          >
                            <Star size={11} className="shrink-0 text-amber-500" aria-hidden />
                            {displayInclusionLabel(token)}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div>
              <p className={fieldLabelCls}>Rules and regulations</p>
              <label className={`${inputWrap} block`}>
                <ScrollText size={15} className="pointer-events-none absolute left-3 top-4 text-zinc-400 transition group-focus-within:text-skyBlue" />
                <textarea
                  className="h-24 w-full resize-none rounded-xl border-0 bg-transparent pl-10 pr-3 pt-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
                  placeholder="e.g. No smoking, Quiet hours at 10 PM"
                  value={form.rules}
                  onChange={(e) => updateField("rules", e.target.value)}
                />
              </label>
            </div>
            <div>
              <p className={fieldLabelCls}>Room status</p>
              <label className={inputWrap}>
                <Hash size={15} className={iconCls} />
                <select
                  className={`${inputCls} appearance-none capitalize`}
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value as RoomFormValues["status"])}
                >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="maintenance">maintenance</option>
                </select>
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 pt-2 max-md:w-full md:flex-row md:flex-wrap md:justify-end [&_button]:max-md:w-full">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-softBorder bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {loading ? "Saving…" : detailsSubmitLabel}
              </button>
            </div>
          </form>
        )}

        {/* Images tab */}
        {tab === "images" && roomId && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:p-6 md:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <RoomPhotosPanel roomId={roomId} onDoneClick={onClose} />
          </div>
        )}
      </div>
    </div>
  , document.body);
}
