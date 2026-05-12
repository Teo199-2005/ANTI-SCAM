"use client";

import { useToast } from "@/components/shared/ToastProvider";
import { RoomPhotosPanel } from "@/components/dashboard/RoomPhotosPanel";
import { apiClient } from "@/lib/api/client";
import { listResorts } from "@/lib/api/resort";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import {
  sanitizeAmenityListTyping,
  sanitizeLongText,
  sanitizeRoomNameInput,
} from "@/lib/inputRestrictions";
import {
  AlignLeft,
  ArrowLeft,
  CircleDollarSign,
  Hash,
  Image as ImageIcon,
  Layers,
  ScrollText,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  mode: "create" | "edit";
  roomId?: number;
};

type RoomStatus = "active" | "inactive" | "maintenance";
type FormState = {
  resort_id: number;
  name: string;
  capacity: number;
  units: number;
  base_price: number;
  bed_count: number;
  bed_type: string;
  inclusions: string[];
  amenities: string[];
  rules: string;
  status: RoomStatus;
};

const INCLUSION_OPTIONS = [
  "WiFi",
  "Hot Shower",
  "Air Conditioning",
  "TV",
  "Mini Fridge",
  "Breakfast Included",
  "Parking",
  "Pool Access",
  "Jacuzzi",
  "Balcony",
  "Toiletries",
  "Room Service",
];

function parseAmenitiesMeta(amenities: string[]) {
  let bedCount = 1;
  let bedType = "Double";
  const inclusions: string[] = [];
  const others: string[] = [];

  for (const item of amenities) {
    if (item.startsWith("BED_COUNT:")) {
      const parsed = Number(item.replace("BED_COUNT:", "").trim());
      if (Number.isFinite(parsed) && parsed > 0) bedCount = parsed;
      continue;
    }
    if (item.startsWith("BED_TYPE:")) {
      const parsed = item.replace("BED_TYPE:", "").trim();
      if (parsed) bedType = parsed;
      continue;
    }
    if (INCLUSION_OPTIONS.includes(item)) {
      inclusions.push(item);
    } else {
      others.push(item);
    }
  }

  return { bedCount, bedType, inclusions, others };
}

const initialForm: FormState = {
  resort_id: 0,
  name: "",
  capacity: 1,
  units: 1,
  base_price: 0,
  bed_count: 1,
  bed_type: "Double",
  inclusions: [],
  amenities: [],
  rules: "",
  status: "active",
};

export default function RoomEditorPage({ mode, roomId }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { pushToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resorts = await listResorts({ perPage: 10 });
        const first = resorts.data?.[0];
        if (!first) {
          setError("No resort is assigned to this account yet.");
          setLoading(false);
          return;
        }

        if (mode === "create") {
          setForm({ ...initialForm, resort_id: first.id });
          setError(null);
          setLoading(false);
          return;
        }

        if (!roomId) {
          setError("Room ID is missing.");
          setLoading(false);
          return;
        }

        const { data } = await apiClient.get<{ success: boolean; data: any }>(`/rooms/${roomId}`);
        const room = data?.data;
        if (!room) {
          setError("Room not found.");
        } else {
          const parsedAmenities = parseAmenitiesMeta(Array.isArray(room.amenities) ? room.amenities : []);
          setForm({
            resort_id: room.resort_id ?? first.id,
            name: room.name ?? "",
            capacity: Number(room.capacity ?? 1),
            units: Math.max(1, Math.min(99, Number(room.units ?? 1))),
            base_price: Number(room.base_price ?? 0),
            bed_count: parsedAmenities.bedCount,
            bed_type: parsedAmenities.bedType,
            inclusions: parsedAmenities.inclusions,
            amenities: parsedAmenities.others,
            rules: room.rules ?? "",
            status: (room.status as RoomStatus) ?? "active",
          });
          setError(null);
        }
      } catch (err) {
        setError(parseApiErrorMessage(err, "Unable to load room details."));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [mode, roomId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    let next = value;
    if (key === "name" && typeof value === "string") next = sanitizeRoomNameInput(value) as FormState[K];
    if (key === "bed_type" && typeof value === "string") next = sanitizeRoomNameInput(value, 80) as FormState[K];
    if (key === "rules" && typeof value === "string") next = sanitizeLongText(value) as FormState[K];
    setForm((prev) => ({ ...prev, [key]: next }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resort_id) return;
    setSaving(true);
    try {
      const normalizedInclusions = Array.from(new Set(form.inclusions));
      const normalizedAmenities = Array.from(new Set(form.amenities.filter(Boolean)));
      const payload = {
        resort_id: form.resort_id,
        name: form.name,
        code: null,
        capacity: form.capacity,
        units: form.units,
        base_price: form.base_price,
        amenities: [
          `BED_COUNT:${form.bed_count}`,
          `BED_TYPE:${form.bed_type}`,
          ...normalizedInclusions,
          ...normalizedAmenities,
        ],
        rules: form.rules || null,
        status: form.status,
      };
      if (mode === "create") {
        await apiClient.post("/rooms", payload);
        pushToast({ title: "Room created", tone: "success" });
      } else {
        await apiClient.put(`/rooms/${roomId}`, payload);
        pushToast({ title: "Room updated", tone: "success" });
      }
      router.push("/dashboard/resort/rooms");
      router.refresh();
    } catch (err) {
      pushToast({
        title: "Save failed",
        description: parseApiErrorMessage(err, "Unable to save room details."),
        tone: "error",
      });
      setSaving(false);
    }
  };

  const inputWrap =
    "group relative rounded-xl border border-softBorder bg-white transition focus-within:border-skyBlue focus-within:ring-2 focus-within:ring-skyBlue/20";
  const iconCls =
    "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 transition group-focus-within:text-skyBlue";
  const inputCls =
    "h-11 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none";

  if (loading) return <div className="dash-card p-8 text-center text-zinc-600">Loading room form…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="dash-page-title">{mode === "create" ? "Add" : "Edit room"}</h1>
          <p className="dash-page-sub">Fill in room details, pricing, photos, and operating status.</p>
        </div>
        <Link href="/dashboard/resort/rooms" className="dash-btn-sm inline-flex items-center gap-2">
          <ArrowLeft size={14} />
          Back to rooms
        </Link>
      </div>

      {error ? <div className="dash-card border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div> : null}

      <form onSubmit={onSubmit} className="dash-card space-y-4 p-6">
        <label className={inputWrap}>
          <AlignLeft size={15} className={iconCls} />
          <input className={inputCls} placeholder="Room name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className={inputWrap}>
            <UserRound size={15} className={iconCls} />
            <input className={inputCls} type="number" min={1} max={50} placeholder="Capacity" value={form.capacity} onChange={(e) => update("capacity", Number(e.target.value))} required />
          </label>
          <label className={inputWrap}>
            <Layers size={15} className={iconCls} />
            <input
              className={inputCls}
              type="number"
              min={1}
              max={99}
              placeholder="Units"
              title="Identical bookable units (parallel overlapping bookings)"
              value={form.units}
              onChange={(e) => update("units", Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              required
            />
          </label>
          <label className={inputWrap}>
            <CircleDollarSign size={15} className={iconCls} />
            <input className={inputCls} type="number" min={0} step="0.01" placeholder="Base price" value={form.base_price} onChange={(e) => update("base_price", Number(e.target.value))} required />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className={inputWrap}>
            <Hash size={15} className={iconCls} />
            <input
              className={inputCls}
              type="number"
              min={1}
              max={20}
              placeholder="How many beds included?"
              value={form.bed_count}
              onChange={(e) => update("bed_count", Number(e.target.value))}
              required
            />
          </label>
          <label className={inputWrap}>
            <AlignLeft size={15} className={iconCls} />
            <select
              className={`${inputCls} appearance-none`}
              value={form.bed_type}
              onChange={(e) => update("bed_type", e.target.value)}
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

        <div className="rounded-xl border border-softBorder bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Common inclusions</p>
          <div className="flex flex-wrap gap-2">
            {INCLUSION_OPTIONS.map((item) => {
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
                        update("inclusions", [...form.inclusions, item]);
                      } else {
                        update("inclusions", form.inclusions.filter((v) => v !== item));
                      }
                    }}
                  />
                  {item}
                </label>
              );
            })}
          </div>
        </div>

        <label className={inputWrap}>
          <ImageIcon size={15} className={iconCls} />
          <input
            className={inputCls}
            placeholder="Other amenities (comma separated)"
            value={form.amenities.join(", ")}
            onChange={(e) =>
              update(
                "amenities",
                sanitizeAmenityListTyping(e.target.value)
                  .split(",")
                  .map((i) => i.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>

        <label className={`${inputWrap} block`}>
          <ScrollText size={15} className="pointer-events-none absolute left-3 top-4 text-zinc-400 transition group-focus-within:text-skyBlue" />
          <textarea className="h-24 w-full resize-none rounded-xl border-0 bg-transparent pl-10 pr-3 pt-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none" placeholder="Rules and regulations" value={form.rules} onChange={(e) => update("rules", e.target.value)} />
        </label>

        <label className={inputWrap}>
          <Hash size={15} className={iconCls} />
          <select className={`${inputCls} appearance-none capitalize`} value={form.status} onChange={(e) => update("status", e.target.value as RoomStatus)}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="maintenance">maintenance</option>
          </select>
        </label>

        <div className="flex flex-col-reverse gap-2 pt-2 md:flex-row md:justify-end">
          <Link href="/dashboard/resort/rooms" className="inline-flex items-center justify-center rounded-xl border border-softBorder bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
            Cancel
          </Link>
          <button type="submit" disabled={saving || !!error} className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save room"}
          </button>
        </div>
      </form>

      {mode === "edit" && roomId && !error ? (
        <div className="dash-card space-y-4 p-6 lg:p-8">
          <h2 className="inline-flex items-center gap-2 font-dash text-lg text-navy">
            <ImageIcon size={18} className="text-skyBlue" />
            Room photos
          </h2>
          <p className="text-sm text-zinc-600">
            Upload up to five images for this room. They power your public landing page and guest booking flows.
          </p>
          <RoomPhotosPanel roomId={roomId} />
        </div>
      ) : null}
    </div>
  );
}

