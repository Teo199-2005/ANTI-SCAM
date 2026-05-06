"use client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";

import { useToast } from "@/components/shared/ToastProvider";
import { listResorts, updateResort } from "@/lib/api/resort";
import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";

type FormState = {
  id: number;
  name: string;
  description: string;
  address: string;
  contact_number: string;
  is_publicly_listed: boolean;
  check_in_time: string;
  check_out_time: string;
  cancellation_policy: string;
  amenities: string;
};

export default function ResortProfilePage() {
  const { pushToast } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resorts = await listResorts({ perPage: 10 });
        const first = resorts.data[0];
        if (!first) {
          setError("No resort assigned to this account.");
          return;
        }
        const raw = first as Record<string, unknown>;
        setForm({
          id: first.id,
          name: first.name,
          description: first.description ?? "",
          address: first.address ?? "",
          contact_number: first.contact_number ?? "",
          is_publicly_listed: first.is_publicly_listed,
          check_in_time: (raw.check_in_time as string) ?? "14:00",
          check_out_time: (raw.check_out_time as string) ?? "12:00",
          cancellation_policy: (raw.cancellation_policy as string) ?? "",
          amenities: Array.isArray(raw.amenities)
            ? (raw.amenities as string[]).join(", ")
            : ((raw.amenities as string) ?? ""),
        });
        setError(null);
      } catch (err) {
        setError(parseApiErrorMessage(err, "Unable to load resort profile."));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading resort profile…</div>;
  }

  if (!form || error) {
    return (
      <div className="dash-card border-rose-200/80 bg-rose-50/90 p-8 text-rose-800">{error ?? "Resort profile unavailable."}</div>
    );
  }

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateResort(form.id, {
        name: form.name,
        description: form.description || null,
        address: form.address || null,
        contact_number: form.contact_number || null,
        is_publicly_listed: form.is_publicly_listed,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        cancellation_policy: form.cancellation_policy || null,
        amenities: form.amenities
          ? form.amenities.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      } as Parameters<typeof updateResort>[1]);
      pushToast({ title: "Resort profile saved", description: "Your property details were updated.", tone: "success" });
    } catch (err) {
      pushToast({
        title: "Save failed",
        description: "We couldn’t update the resort profile. Try again.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="dash-card p-6 lg:p-8">
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <Building2 size={24} className="text-skyBlue" />
          Resort profile
        </h1>
        <p className="dash-page-sub">Update your property details shown to staff and used for reservation operations.</p>
      </div>

      {/* Basic info */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="font-dash text-lg text-navy">Basic information</h2>
        <div>
          <label htmlFor="resort-name" className="mb-1.5 block text-xs font-semibold text-zinc-600">Resort name</label>
          <input
            id="resort-name"
            className="dash-input"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Resort name"
            required
          />
        </div>
        <div>
          <label htmlFor="resort-description" className="mb-1.5 block text-xs font-semibold text-zinc-600">Description</label>
          <textarea
            id="resort-description"
            className="dash-input h-24 resize-none"
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Describe your resort"
          />
        </div>
        <div>
          <label htmlFor="resort-address" className="mb-1.5 block text-xs font-semibold text-zinc-600">Address</label>
          <input
            id="resort-address"
            className="dash-input"
            value={form.address}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Full address"
          />
        </div>
        <div>
          <label htmlFor="resort-contact" className="mb-1.5 block text-xs font-semibold text-zinc-600">Contact number</label>
          <input
            id="resort-contact"
            className="dash-input"
            value={form.contact_number}
            onChange={(e) => onChange("contact_number", e.target.value)}
            placeholder="+63 917 000 0000"
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-softBorder bg-softCard text-skyBlue focus:ring-skyBlue/40"
            checked={form.is_publicly_listed}
            onChange={(e) => onChange("is_publicly_listed", e.target.checked)}
          />
          Publicly listed on platform
        </label>
      </div>

      {/* Check-in / check-out */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="font-dash text-lg text-navy">Check-in &amp; check-out</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="check-in-time" className="mb-1.5 block text-xs font-semibold text-zinc-600">Check-in time</label>
            <input
              id="check-in-time"
              type="time"
              className="dash-input"
              value={form.check_in_time}
              onChange={(e) => onChange("check_in_time", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="check-out-time" className="mb-1.5 block text-xs font-semibold text-zinc-600">Check-out time</label>
            <input
              id="check-out-time"
              type="time"
              className="dash-input"
              value={form.check_out_time}
              onChange={(e) => onChange("check_out_time", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cancellation policy */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="font-dash text-lg text-navy">Cancellation policy</h2>
        <div>
          <label htmlFor="cancellation-policy" className="mb-1.5 block text-xs font-semibold text-zinc-600">Policy description</label>
          <textarea
            id="cancellation-policy"
            className="dash-input h-24 resize-none"
            value={form.cancellation_policy}
            onChange={(e) => onChange("cancellation_policy", e.target.value)}
            placeholder="e.g. Free cancellation up to 48 hours before check-in. No refund for late cancellations."
          />
        </div>
      </div>

      {/* Amenities */}
      <div className="dash-card space-y-4 p-6 lg:p-8">
        <h2 className="font-dash text-lg text-navy">Amenities</h2>
        <div>
          <label htmlFor="resort-amenities" className="mb-1.5 block text-xs font-semibold text-zinc-600">Amenities (comma-separated)</label>
          <input
            id="resort-amenities"
            className="dash-input"
            value={form.amenities}
            onChange={(e) => onChange("amenities", e.target.value)}
            placeholder="Pool, Spa, Free Wi-Fi, Gym, Restaurant"
          />
          <p className="mt-1.5 text-xs text-zinc-500">Separate each amenity with a comma.</p>
        </div>
        {form.amenities && (
          <div className="flex flex-wrap gap-2">
            {form.amenities.split(",").map((a) => a.trim()).filter(Boolean).map((amenity) => (
              <span key={amenity} className="inline-flex items-center rounded-full border border-softBorder bg-softGray px-2.5 py-0.5 text-xs font-medium text-navy shadow-sm">
                {amenity}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="dash-btn-primary disabled:opacity-50">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

