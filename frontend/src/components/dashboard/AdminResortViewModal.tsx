"use client";

import { SubscriptionPlanLabel } from "@/components/badges/SubscriptionPlanLabel";
import DashModal from "@/components/dash/DashModal";
import { getResort, type ResortItem } from "@/lib/api/resort";
import { formatSubscriptionStatusLabel } from "@/lib/billing/subscriptionStatus";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { formatPhp } from "@/lib/formatPhp";
import { ExternalLink, Globe, Loader2, PenLine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-softBorder/80 py-2.5 last:border-0 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-800">{children}</span>
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function publicResortHref(subdomain: string | null | undefined): string | null {
  const slug = subdomain?.trim();
  if (!slug) return null;
  return `/resort/${encodeURIComponent(slug)}`;
}

export type AdminResortViewModalProps = {
  resortId: number | null;
  open: boolean;
  onClose: () => void;
};

export default function AdminResortViewModal({ resortId, open, onClose }: AdminResortViewModalProps) {
  const [resort, setResort] = useState<ResortItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || resortId == null) {
      setResort(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getResort(resortId)
      .then((data) => {
        if (!cancelled) setResort(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setResort(null);
          setError(parseApiErrorMessage(err, "Could not load resort details."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, resortId]);

  const publicHref = publicResortHref(resort?.subdomain);

  return (
    <DashModal
      open={open}
      onClose={onClose}
      title={resort?.name ?? "Resort details"}
      description={loading ? "Loading…" : resort ? `Resort #${resort.id} · Tenant #${resort.tenant_id}` : undefined}
      className="max-w-3xl"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-600">
          <Loader2 size={18} className="animate-spin text-primaryBlue" aria-hidden />
          Loading resort information…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
      ) : resort ? (
        <div className="space-y-6">
          {resort.logo_url ? (
            <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-2xl border border-softBorder bg-white shadow-soft-sm">
              <Image src={resort.logo_url} alt="" fill className="object-cover" sizes="80px" unoptimized />
            </div>
          ) : null}

          <section>
            <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Overview</h3>
            <div className="rounded-xl border border-softBorder bg-softCard/60 px-4">
              <DetailRow label="Name">{resort.name}</DetailRow>
              <DetailRow label="Description">
                {resort.description?.trim() ? (
                  <p className="whitespace-pre-wrap">{resort.description}</p>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Contact">{resort.contact_number ?? "—"}</DetailRow>
              <DetailRow label="Rooms">{resort.rooms_count ?? 0}</DetailRow>
            </div>
          </section>

          <section>
            <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Location</h3>
            <div className="rounded-xl border border-softBorder bg-softCard/60 px-4">
              <DetailRow label="Address">{resort.address_display ?? resort.address ?? resort.address_label ?? "—"}</DetailRow>
              {resort.address_street_line ? (
                <DetailRow label="Street">{resort.address_street_line}</DetailRow>
              ) : null}
              {resort.map_latitude != null && resort.map_longitude != null ? (
                <DetailRow label="Map">
                  {resort.map_latitude}, {resort.map_longitude}
                </DetailRow>
              ) : null}
            </div>
          </section>

          <section>
            <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Representative</h3>
            <div className="rounded-xl border border-softBorder bg-softCard/60 px-4">
              <DetailRow label="Name">{resort.representative_name ?? "—"}</DetailRow>
              <DetailRow label="Contact">{resort.representative_contact_number ?? "—"}</DetailRow>
            </div>
          </section>

          <section>
            <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Platform</h3>
            <div className="rounded-xl border border-softBorder bg-softCard/60 px-4">
              <DetailRow label="Subdomain">{resort.subdomain ?? "—"}</DetailRow>
              <DetailRow label="Public listing">
                {resort.is_publicly_listed ? "Listed on platform" : "Not listed"}
              </DetailRow>
              <DetailRow label="VIP">{resort.is_vip ? "Yes" : "No"}</DetailRow>
              {publicHref ? (
                <DetailRow label="Public page">
                  <Link
                    href={publicHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primaryBlue hover:underline"
                  >
                    Open landing page
                    <ExternalLink size={13} aria-hidden />
                  </Link>
                </DetailRow>
              ) : null}
            </div>
          </section>

          {resort.subscription ? (
            <section>
              <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Subscription</h3>
              <div className="rounded-xl border border-softBorder bg-softCard/60 px-4">
                <DetailRow label="Plan">
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <SubscriptionPlanLabel plan={resort.subscription.plan} />
                    <span className="text-zinc-500">·</span>
                    <span>{formatSubscriptionStatusLabel(resort.subscription.status)}</span>
                  </span>
                </DetailRow>
                <DetailRow label="Monthly fee">{formatPhp(resort.subscription.total_monthly_fee)}</DetailRow>
                <DetailRow label="Included rooms">{resort.subscription.included_rooms}</DetailRow>
                <DetailRow label="Active rooms">{resort.subscription.active_room_count}</DetailRow>
                <DetailRow label="Extra room fee">{formatPhp(resort.subscription.extra_room_fee)}</DetailRow>
                <DetailRow label="Billing cycle">
                  {resort.subscription.billing_cycle_start} → {resort.subscription.billing_cycle_end}
                </DetailRow>
                <DetailRow label="Next due">{resort.subscription.next_due_date ?? "—"}</DetailRow>
              </div>
            </section>
          ) : null}

          {(resort.facebook_url || resort.instagram_url || resort.tiktok_url) ? (
            <section>
              <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Social</h3>
              <div className="rounded-xl border border-softBorder bg-softCard/60 px-4">
                {resort.facebook_url ? (
                  <DetailRow label="Facebook">
                    <a href={resort.facebook_url} target="_blank" rel="noopener noreferrer" className="break-all text-primaryBlue hover:underline">
                      {resort.facebook_url}
                    </a>
                  </DetailRow>
                ) : null}
                {resort.instagram_url ? (
                  <DetailRow label="Instagram">
                    <a href={resort.instagram_url} target="_blank" rel="noopener noreferrer" className="break-all text-primaryBlue hover:underline">
                      {resort.instagram_url}
                    </a>
                  </DetailRow>
                ) : null}
                {resort.tiktok_url ? (
                  <DetailRow label="TikTok">
                    <a href={resort.tiktok_url} target="_blank" rel="noopener noreferrer" className="break-all text-primaryBlue hover:underline">
                      {resort.tiktok_url}
                    </a>
                  </DetailRow>
                ) : null}
              </div>
            </section>
          ) : null}

          {resort.amenities && resort.amenities.length > 0 ? (
            <section>
              <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Amenities</h3>
              <ul className="flex flex-wrap gap-2">
                {resort.amenities.map((item) => (
                  <li key={item} className="rounded-full border border-softBorder bg-softGray/60 px-2.5 py-1 text-xs text-zinc-700">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {resort.cancellation_policy?.trim() ? (
            <section>
              <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Cancellation policy</h3>
              <p className="rounded-xl border border-softBorder bg-softCard/60 px-4 py-3 text-sm text-zinc-700 whitespace-pre-wrap">
                {resort.cancellation_policy}
              </p>
            </section>
          ) : null}

          <section>
            <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">Record</h3>
            <div className="rounded-xl border border-softBorder bg-softCard/60 px-4">
              <DetailRow label="Resort ID">{resort.id}</DetailRow>
              <DetailRow label="Tenant ID">{resort.tenant_id}</DetailRow>
              <DetailRow label="Created">{formatDate(resort.created_at)}</DetailRow>
              <DetailRow label="Updated">{formatDate(resort.updated_at)}</DetailRow>
            </div>
          </section>

          <div className="flex flex-wrap gap-2 border-t border-softBorder pt-4">
            {publicHref ? (
              <Link href={publicHref} target="_blank" rel="noopener noreferrer" className="dash-btn-sm">
                <Globe size={14} />
                Public page
              </Link>
            ) : null}
            <Link href={`/dashboard/admin/onboard?resort_id=${resort.id}`} className="dash-btn-sm">
              <PenLine size={14} />
              Edit resort
            </Link>
            <button type="button" onClick={onClose} className="dash-btn-sm ml-auto">
              Close
            </button>
          </div>
        </div>
      ) : null}
    </DashModal>
  );
}
