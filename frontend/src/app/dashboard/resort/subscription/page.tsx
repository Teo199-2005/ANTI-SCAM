"use client";

import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { getResort, listResorts, ResortItem, SubscriptionInfo } from "@/lib/api/resort";
import { BadgeCheck, CreditCard, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

const subStatusBadge: Record<string, string> = {
  active: "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  grace_period: "dash-badge-amber",
  suspended: "dash-badge-rose",
  cancelled: "dash-badge-slate",
};

const planLabel: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
  vip: "Verified / VIP",
};

export default function ResortSubscriptionPage() {
  const [resort, setResort] = useState<ResortItem | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const resorts = await listResorts({ perPage: 10 });
      const first = resorts.data[0];
      setResort(first ?? null);
      if (!first) {
        setSubscription(null);
        setError("No resort assigned.");
        return;
      }
      const full = await getResort(first.id);
      setSubscription(full.subscription ?? null);
      setError(null);
    } catch (err) {
      setError("Unable to load subscription details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const refreshBilling = async () => {
    if (!resort || !subscription) return;
    setRefreshing(true);
    try {
      await apiClient.post(`/resorts/${resort.id}/subscriptions/refresh`, { plan: subscription.plan });
      await load();
      pushToast({ title: "Subscription refreshed", tone: "success" });
    } catch (err) {
      pushToast({ title: "Refresh failed", description: "Unable to refresh subscription.", tone: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const changePlan = async (plan: string) => {
    if (!resort) return;
    setRefreshing(true);
    try {
      // try to request server to switch plan
      await apiClient.post(`/resorts/${resort.id}/subscriptions/refresh`, { plan });
      await load();
      pushToast({ title: `Plan changed to ${plan}`, tone: "success" });
    } catch (err) {
      pushToast({ title: "Change plan failed", description: err instanceof Error ? err.message : String(err), tone: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="dash-card p-8 text-center text-zinc-600">Loading subscription…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title inline-flex items-center gap-2">
          <CreditCard size={24} className="text-skyBlue" />
          Subscription
        </h1>
        <p className="dash-page-sub">Review your plan, monthly fee breakdown, and billing cycle status.</p>
      </div>

      {error ? <div className="dash-card border-rose-200/80 bg-rose-50/90 p-6 text-rose-800">{error}</div> : null}

  {subscription ? (
        <div className="dash-card p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-600">Current plan</p>
              <p className="inline-flex items-center gap-2 font-dash text-2xl text-navy md:text-3xl">
                <BadgeCheck size={22} className="text-emerald-600" />
                {planLabel[subscription.plan] ?? subscription.plan}
              </p>
            </div>
            <span className={subStatusBadge[subscription.status] ?? "dash-badge-slate"}>
              {subscription.status.replaceAll("_", " ")}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: "Base price", value: `₱${Number(subscription.base_price).toLocaleString()}` },
              { label: "Included rooms", value: String(subscription.included_rooms) },
              { label: "Extra room fee", value: `₱${Number(subscription.extra_room_fee).toLocaleString()}` },
              { label: "Active rooms counted", value: String(subscription.active_room_count) },
            ].map((row) => (
              <div key={row.label} className="dash-inset p-4">
                <p className="text-sm text-zinc-600">{row.label}</p>
                <p className="mt-1 font-semibold text-navy">{row.value}</p>
              </div>
            ))}
            <div className="dash-inset p-4 md:col-span-2">
              <p className="text-sm text-zinc-600">Total monthly fee</p>
              <p className="mt-1 font-dash text-3xl text-skyBlue">₱{Number(subscription.total_monthly_fee).toLocaleString()}</p>
            </div>
          </div>

          <div className="dash-inset mt-6 p-4 text-sm">
            <p>
              Billing cycle:{" "}
              <span className="font-medium text-zinc-900">{subscription.billing_cycle_start}</span> to{" "}
              <span className="font-medium text-zinc-900">{subscription.billing_cycle_end}</span>
            </p>
            <p className="mt-1">
              Next due date: <span className="font-medium text-zinc-900">{subscription.next_due_date}</span>
            </p>
            {subscription.grace_until ? (
              <p className="mt-1">
                Grace period until: <span className="font-medium text-zinc-900">{subscription.grace_until}</span>
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="dash-btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              onClick={() => void refreshBilling()}
              disabled={refreshing}
            >
              <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh calculation"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Plan marketplace */}
      <div>
        <h2 className="dash-page-sub">Choose a plan</h2>
        <div className="grid gap-4 md:grid-cols-3 mt-3">
          <div className="dash-card p-4">
            <h3 className="font-dash text-lg">Basic Subscription</h3>
            <p className="text-sm text-zinc-600">3 rooms — ₱1,300.00 / month</p>
            <ul className="mt-3 text-sm space-y-1">
              <li>Booking Management System</li>
              <li>Payment System (Gcash or credit cards)</li>
              <li>5 pictures per room allowed</li>
              <li>Full room description</li>
              <li>Real time room availability</li>
              <li>Tech Support 8am-4pm Mon-Fri</li>
            </ul>
            <div className="mt-4">
              <button onClick={() => void changePlan('basic')} className="dash-btn-sm">Select Basic</button>
            </div>
          </div>

          <div className="dash-card p-4">
            <h3 className="font-dash text-lg">Premium Subscription</h3>
            <p className="text-sm text-zinc-600">6 rooms — ₱2,500.00 / month</p>
            <ul className="mt-3 text-sm space-y-1">
              <li>Booking Management System</li>
              <li>Payment System (Gcash or credit cards)</li>
              <li>5 pictures per room allowed</li>
              <li>Full room description</li>
              <li>Real time room availability</li>
              <li>Tech Support 8am-4pm Mon-Fri</li>
            </ul>
            <div className="mt-4">
              <button onClick={() => void changePlan('premium')} className="dash-btn-sm">Select Premium</button>
            </div>
          </div>

          <div className="dash-card p-4">
            <h3 className="font-dash text-lg">GOLDEN VIP Subscription</h3>
            <p className="text-sm text-zinc-600">10 rooms — ₱5,000.00 / month</p>
            <ul className="mt-3 text-sm space-y-1">
              <li>Booking Management System</li>
              <li>Payment System (Gcash or credit cards)</li>
              <li>5 pictures per room allowed</li>
              <li>Full room description</li>
              <li>Real time room availability</li>
              <li>24/7 Dedicated Customer Service Assistance</li>
            </ul>
            <div className="mt-4">
              <button onClick={() => void changePlan('vip')} className="dash-btn-accent">Select GOLDEN VIP</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

