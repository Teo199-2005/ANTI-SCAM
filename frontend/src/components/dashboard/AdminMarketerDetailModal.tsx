"use client";

import DashModal from "@/components/dash/DashModal";
import GovIdDocumentPreview from "@/components/marketing/GovIdDocumentPreview";
import { TableEntityThumb } from "@/components/shared/TableEntityThumb";
import {
  getAdminMarketerDetail,
  type AdminMarketerDetailBookingCommission,
  type AdminMarketerDetailClient,
  type AdminMarketerDetailPayload,
  type AdminMarketerDetailTransaction,
  type AdminMarketerProfileDetail,
} from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { isXenditLiveMode, isXenditTestMode } from "@/lib/billingXendit";
import { formatPhpLedger as fmtPhp } from "@/lib/formatPhp";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  Circle,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

type TabId = "monitoring" | "profile";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "profile", label: "Profile & KYC", icon: IdCard },
];

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function planLabel(plan: string | null, isRoomAddon: boolean) {
  if (!plan) return "—";
  if (isRoomAddon) return `${plan} (room add-on)`;
  return plan;
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "paid" || s === "released" || s === "credit") {
    return <span className="dash-badge-emerald capitalize">{status}</span>;
  }
  if (s === "pending" || s === "pending_payment") {
    return <span className="dash-badge-amber capitalize">{status}</span>;
  }
  if (s === "reversal" || s === "cancelled" || s === "failed") {
    return <span className="dash-badge-rose capitalize">{status}</span>;
  }
  return <span className="dash-badge-slate capitalize">{status}</span>;
}

function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-800">{value ?? "—"}</p>
    </div>
  );
}

type MarketerSummary = AdminMarketerDetailPayload["marketer"];

function ProfileTab({ marketer, profile }: { marketer: MarketerSummary; profile: AdminMarketerProfileDetail }) {
  const xenditLabel = isXenditLiveMode(profile.billing_xendit_mode)
    ? "Live (production)"
    : isXenditTestMode(profile.billing_xendit_mode)
      ? "Test (development key)"
      : "Not configured";

  const checklist = [
    { label: "Full name", ok: Boolean(marketer.name?.trim()) },
    { label: "Philippine mailing location", ok: Boolean(profile.marketer_mailing_address?.trim()) },
    {
      label: "Valid government ID (type, number & upload)",
      ok: profile.marketer_gov_id_complete,
    },
    { label: "TIN (strongly recommended)", ok: Boolean(profile.marketer_tin_masked) },
    { label: "Mobile number", ok: Boolean(profile.phone?.trim()) },
    { label: "Email", ok: Boolean(marketer.email?.trim()) },
    { label: "GCash payout details (on file)", ok: profile.gcash_payout_configured },
    { label: "Profile photo", ok: Boolean(profile.avatar_url) },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-softBorder bg-white p-4">
        <TableEntityThumb imageUrl={profile.avatar_url} name={marketer.name} kind="person" size="md" className="h-14 w-14 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-dash text-lg font-semibold text-navy">{marketer.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-600">
            <Mail size={14} className="shrink-0 text-zinc-400" aria-hidden />
            {marketer.email}
          </p>
          {profile.phone ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-600">
              <Phone size={14} className="shrink-0 text-zinc-400" aria-hidden />
              {profile.phone}
            </p>
          ) : null}
          {marketer.referral_code ? (
            <p className="mt-1 font-mono text-xs text-violet-700">Referral code: {marketer.referral_code}</p>
          ) : null}
          <p className="mt-1 text-xs text-zinc-500">Joined {fmtWhen(profile.joined_at ?? marketer.joined_at)}</p>
        </div>
      </div>

      <section className="rounded-xl border border-softBorder bg-softGray/20 p-4">
        <h3 className="mb-3 text-sm font-semibold text-navy">Partner information checklist</h3>
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5 text-sm">
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
              )}
              <span className={item.ok ? "text-zinc-800" : "text-zinc-600"}>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-xl border border-softBorder bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <MapPin size={16} className="text-skyBlue" />
          Contact &amp; mailing
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField label="Mobile" value={profile.phone} />
          <ProfileField label="Email" value={marketer.email} />
          <ProfileField
            label="Mailing address"
            value={profile.marketer_mailing_address ?? profile.mailing_location_label ?? "—"}
          />
          {profile.mailing_barangay_name ? (
            <ProfileField label="Barangay" value={profile.mailing_barangay_name} />
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-softBorder bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <IdCard size={16} className="text-skyBlue" />
          Government ID &amp; tax
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField
            label="ID type"
            value={profile.marketer_gov_id_label ?? profile.marketer_gov_id_type ?? "Not selected"}
          />
          <ProfileField
            label="ID number (masked)"
            value={profile.marketer_gov_id_number_masked ?? (profile.marketer_gov_id_has_number ? "On file" : "—")}
          />
          <ProfileField label="TIN (masked)" value={profile.marketer_tin_masked ?? "Not on file"} />
          <ProfileField
            label="KYC status"
            value={
              profile.marketer_gov_id_complete ? (
                <span className="font-semibold text-emerald-700">Complete</span>
              ) : (
                <span className="text-amber-800">Incomplete — missing type, number, or upload</span>
              )
            }
          />
        </div>
        {profile.marketer_gov_id_document_url ? (
          <GovIdDocumentPreview
            src={profile.marketer_gov_id_document_url}
            title={`ID document — ${profile.marketer_gov_id_label ?? "uploaded"}`}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-softBorder bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">
            No government ID document uploaded.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-softBorder bg-white p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
          <Wallet size={16} className="text-skyBlue" />
          GCash payout
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField
            label="GCash number (masked)"
            value={profile.gcash_masked_number ?? (profile.gcash_payout_configured ? "On file" : "Not set")}
          />
          <ProfileField label="Account holder name" value={profile.gcash_account_holder_name} />
          <ProfileField
            label="Payout ready"
            value={profile.gcash_payout_configured ? "Yes" : "No — number or name missing"}
          />
          <ProfileField label="Xendit mode (platform)" value={xenditLabel} />
          <ProfileField
            label="Automated payout (10th)"
            value={profile.marketing_payout_automation_enabled ? "Enabled on server" : "Disabled on server"}
          />
        </div>
      </section>

      {(profile.marketer_bank_name || profile.marketer_bank_account_masked) && (
        <section className="space-y-3 rounded-xl border border-softBorder bg-white p-4">
          <h3 className="text-sm font-semibold text-navy">Bank details (legacy)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileField label="Bank" value={profile.marketer_bank_name} />
            <ProfileField label="Branch" value={profile.marketer_bank_branch} />
            <ProfileField label="Account name" value={profile.marketer_bank_account_name} />
            <ProfileField label="Account (masked)" value={profile.marketer_bank_account_masked} />
          </div>
        </section>
      )}
    </div>
  );
}

function ClientCard({ c }: { c: AdminMarketerDetailClient }) {
  const isSignupReferral =
    c.source === "signup_referral" || c.source === "signup_trial";
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        isSignupReferral ? "border-violet-200/80 bg-violet-50/30" : "border-softBorder bg-white",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-navy">{c.tenant_name}</p>
          {c.owner_name || c.owner_email ? (
            <p className="mt-0.5 text-xs text-zinc-600">
              {c.owner_name ?? "Owner"}
              {c.owner_email ? <span className="block text-zinc-500">{c.owner_email}</span> : null}
            </p>
          ) : null}
          {c.tenant_slug ? <p className="mt-1 text-[11px] text-zinc-500">Tenant · {c.tenant_slug}</p> : null}
        </div>
        {isSignupReferral ? (
          <span className="dash-badge-violet text-[10px]">Referred signup</span>
        ) : (
          <span className="dash-badge-sky text-[10px]">Converting client</span>
        )}
      </div>
      {isSignupReferral ? (
        <p className="mt-2 text-xs text-zinc-600">
          Referred {fmtWhen(c.referred_at ?? c.trial_ends_at)}
          {c.referral_code ? <span className="ml-1 font-mono text-violet-700">· {c.referral_code}</span> : null}
          <span className="block text-zinc-500">No paid subscription yet — booking commissions apply after guest bookings are paid online.</span>
        </p>
      ) : (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-600 sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-zinc-400">First paid</dt>
            <dd>{fmtWhen(c.first_qualifying_paid_at)}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-zinc-400">Last paid</dt>
            <dd>{fmtWhen(c.last_qualifying_paid_at)}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-zinc-400">Qualifying invoices</dt>
            <dd className="tabular-nums">{c.qualifying_subscription_invoices}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-zinc-400">Resorts billed</dt>
            <dd className="tabular-nums">{c.referred_resorts_count}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="font-semibold uppercase tracking-wide text-zinc-400">Volume (qualifying)</dt>
            <dd className="tabular-nums font-medium text-navy">{fmtPhp(c.total_subscription_volume_php)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function TransactionCard({ t }: { t: AdminMarketerDetailTransaction }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-softBorder bg-white px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-navy">{t.resort_name ?? "—"}</p>
        {t.tenant_name ? <p className="text-[11px] text-zinc-500">{t.tenant_name}</p> : null}
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {fmtWhen(t.paid_at)} · {planLabel(t.plan, t.is_room_addon)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {statusBadge(t.status)}
        <p className="mt-1 font-semibold tabular-nums text-navy">{fmtPhp(t.amount_php)}</p>
      </div>
    </div>
  );
}

function BookingCommissionCard({ row }: { row: AdminMarketerDetailBookingCommission }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-softBorder bg-white px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-navy">{row.resort_name ?? "—"}</p>
        {row.reference_no ? <p className="font-mono text-[11px] text-zinc-500">{row.reference_no}</p> : null}
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {fmtWhen(row.created_at)} · {row.period}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {statusBadge(row.type)}
        <p className="mt-1 font-semibold tabular-nums text-navy">{fmtPhp(row.amount_php)}</p>
      </div>
    </div>
  );
}

function MonitoringTab({ detail, marketer: m }: { detail: AdminMarketerDetailPayload; marketer: MarketerSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl border border-softBorder bg-softGray/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Booking credits</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-navy">{m.qualifying_bookings_count ?? 0}</p>
          <p className="text-xs text-zinc-600">
            {fmtPhp(m.booking_credits_gross_php ?? 0)} gross · {m.booking_reversals_count ?? 0} reversed
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Current rate (new)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-violet-800">
            {fmtPhp(m.current_commission_per_booking_php ?? 10)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Referral clients</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-navy">{m.referral_signup_clients_count ?? 0}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Assigned resorts</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-navy">{m.assigned_resorts_count}</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Commission ledger</p>
          <p className="mt-1 text-xs text-zinc-700">
            Pending {fmtPhp(m.commission_pending_php)} · Released {fmtPhp(m.commission_released_gross_php)} · Total{" "}
            <strong>{fmtPhp(m.commission_total_gross_php)}</strong>
          </p>
        </div>
      </div>

      {(detail.legacy_subscription_commissions?.length ?? 0) > 0 ? (
        <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
          <h3 className="font-dash text-base font-semibold text-amber-950">
            Legacy subscription commissions (audit)
          </h3>
          <p className="mt-1 text-xs text-amber-900/90">
            {detail.legacy_subscription_commissions_meta?.definition ??
              "Deprecated tier payouts from paid platform subscriptions — not booking commissions."}
            {(detail.legacy_subscription_commissions_meta?.voided_pending_rows ?? 0) > 0 ? (
              <span className="mt-1 block font-medium">
                Removed {detail.legacy_subscription_commissions_meta?.voided_pending_rows} incorrect pending
                row(s) on this load.
              </span>
            ) : null}
          </p>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
            {detail.legacy_subscription_commissions?.map((row) => (
              <li key={row.commission_id} className="rounded-lg border border-amber-200/60 bg-white/80 px-3 py-2">
                <p className="font-medium text-navy">
                  {fmtPhp(row.amount_php)} · {row.marketer_tier ?? "legacy"} · {row.resort_name ?? "Resort"} ·{" "}
                  {row.period}
                </p>
                <p className="text-[11px] text-zinc-600">
                  Status: {row.status}
                  {row.unit_commission_php != null ? ` · Tier rate ${fmtPhp(row.unit_commission_php)}` : null}
                </p>
                {row.trigger ? (
                  <p className="mt-1 text-[11px] text-zinc-700">
                    Triggered by paid subscription invoice {fmtPhp(row.trigger.amount_php)} (
                    {row.trigger.plan ?? "plan"}) on {fmtWhen(row.trigger.paid_at)} — invoice #
                    {row.trigger.subscription_invoice_id}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-zinc-500">No matching paid invoice found for this period.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="mb-1 font-dash text-base font-semibold text-navy">
          Booking commissions ({detail.booking_commissions_meta?.total ?? detail.booking_commissions.length})
        </h3>
        <p className="mb-3 text-xs text-zinc-500">{detail.booking_commissions_meta?.definition}</p>
        {detail.booking_commissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-softBorder bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600">
            No booking commission events yet.
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-softBorder bg-softGray/20 p-2">
            {detail.booking_commissions.map((row) => (
              <BookingCommissionCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 font-dash text-base font-semibold text-navy">
          <UserRound size={16} className="text-skyBlue" />
          Clients ({detail.clients_meta.paid_converting} converting
          {(detail.clients_meta.signup_referral ?? detail.clients_meta.signup_trial) > 0
            ? `, ${detail.clients_meta.signup_referral ?? detail.clients_meta.signup_trial} referred signup${(detail.clients_meta.signup_referral ?? detail.clients_meta.signup_trial) === 1 ? "" : "s"}`
            : ""}
          )
        </h3>
        {detail.clients.length === 0 ? (
          <p className="rounded-xl border border-dashed border-softBorder bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
            No referred clients yet.
          </p>
        ) : (
          <div className="space-y-2">
            {detail.clients.map((c) => (
              <ClientCard
                key={
                  c.tenant_id != null
                    ? `tenant-${c.tenant_id}`
                    : c.referred_user_id != null
                      ? `user-${c.referred_user_id}`
                      : `owner-${c.owner_email ?? c.tenant_name}`
                }
                c={c}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 font-dash text-base font-semibold text-navy">
          Subscription transactions ({detail.transactions_meta.total})
        </h3>
        <p className="mb-3 text-xs text-zinc-500">{detail.transactions_meta.definition}</p>
        {detail.transactions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-softBorder bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
            No subscription invoices attributed to this partner.
          </p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-softBorder bg-softGray/20 p-2">
            {detail.transactions.map((t) => (
              <TransactionCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export type AdminMarketerDetailModalProps = {
  marketerId: number | null;
  open: boolean;
  onClose: () => void;
};

export default function AdminMarketerDetailModal({ marketerId, open, onClose }: AdminMarketerDetailModalProps) {
  const [tab, setTab] = useState<TabId>("monitoring");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminMarketerDetailPayload | null>(null);

  useEffect(() => {
    if (!open || marketerId == null) {
      setDetail(null);
      setError(null);
      setTab("monitoring");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTab("monitoring");

    void getAdminMarketerDetail(marketerId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(parseApiErrorMessage(err, "Could not load partner details."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, marketerId]);

  const m = detail?.marketer;
  const profile = m?.profile;

  return (
    <DashModal
      open={open}
      onClose={onClose}
      title={m ? m.name : "Marketing partner"}
      description={
        m ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{m.email}</span>
            {profile?.phone ? (
              <span className="inline-flex items-center gap-1 text-zinc-600">
                <Phone size={12} aria-hidden />
                {profile.phone}
              </span>
            ) : null}
            {m.referral_code ? (
              <span>
                · Code <span className="font-mono text-violet-700">{m.referral_code}</span>
              </span>
            ) : null}
          </span>
        ) : (
          "Commissions, clients, and full partner profile for admin review."
        )
      }
      className="max-w-4xl"
      padded={false}
    >
      <div className="border-b border-softBorder px-6 pt-4">
        <div className="flex flex-wrap gap-2 pb-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                disabled={loading || !detail}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "bg-navy text-white shadow-soft-sm"
                    : "bg-softCard text-zinc-600 ring-1 ring-softBorder hover:bg-metalFace",
                )}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[min(72vh,680px)] overflow-x-hidden overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-600">
            <Loader2 size={18} className="animate-spin text-skyBlue" />
            Loading partner details…
          </div>
        ) : error ? (
          <p className="dash-alert-error mt-4">{error}</p>
        ) : detail && m && profile ? (
          <div className="pt-4">
            {tab === "monitoring" ? <MonitoringTab detail={detail} marketer={m} /> : null}
            {tab === "profile" ? <ProfileTab marketer={m} profile={profile} /> : null}
          </div>
        ) : null}
      </div>
    </DashModal>
  );
}
