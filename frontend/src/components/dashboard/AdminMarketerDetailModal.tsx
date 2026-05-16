"use client";

import DashModal from "@/components/dash/DashModal";
import MarketerTierBadge from "@/components/dashboard/MarketerTierBadge";
import {
  getAdminMarketerDetail,
  type AdminMarketerDetailClient,
  type AdminMarketerDetailPayload,
  type AdminMarketerDetailTransaction,
} from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { formatPhpLedger as fmtPhp } from "@/lib/formatPhp";
import { Gift, Loader2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

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
  if (s === "paid") return <span className="dash-badge-emerald capitalize">{status}</span>;
  if (s === "pending") return <span className="dash-badge-amber capitalize">{status}</span>;
  return <span className="dash-badge-slate capitalize">{status}</span>;
}

function ClientCard({ c }: { c: AdminMarketerDetailClient }) {
  const isTrial = c.source === "signup_trial";
  return (
    <div
      className={`rounded-xl border p-3 ${
        isTrial ? "border-emerald-200/80 bg-emerald-50/40" : "border-softBorder bg-white"
      }`}
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
        {isTrial ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            <Gift size={11} aria-hidden />
            {c.trial_active ? "Trial active" : "Trial ended"}
          </span>
        ) : (
          <span className="dash-badge-sky text-[10px]">Converting client</span>
        )}
      </div>
      {isTrial ? (
        <p className="mt-2 text-xs text-zinc-600">
          Trial {c.trial_active ? "ends" : "ended"} {fmtWhen(c.trial_ends_at)}
          {c.referral_code ? <span className="ml-1 font-mono text-violet-700">· {c.referral_code}</span> : null}
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

function TransactionRow({ t }: { t: AdminMarketerDetailTransaction }) {
  return (
    <tr>
      <td className="text-sm text-zinc-800">{fmtWhen(t.paid_at)}</td>
      <td>
        <div className="font-medium text-navy">{t.resort_name ?? "—"}</div>
        {t.tenant_name ? <div className="text-[11px] text-zinc-500">{t.tenant_name}</div> : null}
      </td>
      <td className="text-xs text-zinc-600">{planLabel(t.plan, t.is_room_addon)}</td>
      <td>{statusBadge(t.status)}</td>
      <td className="text-right tabular-nums font-medium">{fmtPhp(t.amount_php)}</td>
    </tr>
  );
}

export type AdminMarketerDetailModalProps = {
  marketerId: number | null;
  open: boolean;
  onClose: () => void;
};

export default function AdminMarketerDetailModal({ marketerId, open, onClose }: AdminMarketerDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminMarketerDetailPayload | null>(null);

  useEffect(() => {
    if (!open || marketerId == null) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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

  return (
    <DashModal
      open={open}
      onClose={onClose}
      title={m ? m.name : "Marketing partner"}
      description={
        m ? (
          <span>
            {m.email}
            {m.referral_code ? (
              <>
                {" "}
                · Code <span className="font-mono text-violet-700">{m.referral_code}</span>
              </>
            ) : null}
          </span>
        ) : (
          "Clients and subscription transactions attributed to this partner."
        )
      }
      className="max-w-4xl"
      padded={false}
    >
      <div className="max-h-[min(78vh,720px)] overflow-y-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-600">
            <Loader2 size={18} className="animate-spin text-skyBlue" />
            Loading partner details…
          </div>
        ) : error ? (
          <p className="dash-alert-error mt-4">{error}</p>
        ) : detail && m ? (
          <div className="space-y-6 pt-4">
            <div className="grid gap-3 rounded-xl border border-softBorder bg-softGray/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Tier</p>
                <div className="mt-1">
                  <MarketerTierBadge tierKey={m.marketer_tier_key} label={m.marketer_tier_label} size="sm" />
                </div>
                {m.per_payment_php != null ? (
                  <p className="mt-1 text-xs tabular-nums text-navy">{fmtPhp(m.per_payment_php)} / credit</p>
                ) : null}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Converting clients</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-navy">{m.converting_clients_count}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Assigned resorts</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-navy">{m.assigned_resorts_count}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Commission</p>
                <p className="mt-1 text-xs text-zinc-700">
                  Pending {fmtPhp(m.commission_pending_php)} · Released {fmtPhp(m.commission_released_gross_php)} · Total{" "}
                  <strong>{fmtPhp(m.commission_total_gross_php)}</strong>
                </p>
              </div>
            </div>

            <section>
              <h3 className="mb-2 flex items-center gap-2 font-dash text-base font-semibold text-navy">
                <UserRound size={16} className="text-skyBlue" />
                Clients ({detail.clients_meta.paid_converting} converting
                {detail.clients_meta.signup_trial > 0
                  ? `, ${detail.clients_meta.signup_trial} trial signup${detail.clients_meta.signup_trial === 1 ? "" : "s"}`
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
                <div className="overflow-x-auto rounded-xl border border-softBorder">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-softBorder bg-softGray/30 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Resort / client</th>
                        <th className="px-3 py-2">Plan</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-softBorder/80">
                      {detail.transactions.map((t) => (
                        <TransactionRow key={t.id} t={t} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </DashModal>
  );
}
