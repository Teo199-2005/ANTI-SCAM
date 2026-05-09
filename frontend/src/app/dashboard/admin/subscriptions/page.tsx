"use client";

import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { useToast } from "@/components/shared/ToastProvider";
import { apiClient } from "@/lib/api/client";
import { getAdminSubscriptionOverview } from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { ResortItem } from "@/lib/api/resort";
import { triggerSubscriptionInvoice } from "@/lib/api/subscription";
import { CreditCard, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

const statusBadge: Record<string, string> = {
  active:          "dash-badge-emerald",
  pending_payment: "dash-badge-amber",
  grace_period:    "dash-badge-orange",
  suspended:       "dash-badge-rose",
  cancelled:       "dash-badge-slate",
};

export default function AdminSubscriptionsPage() {
  const [resorts, setResorts] = useState<ResortItem[]>([]);
  const [latestInvoiceStatus, setLatestInvoiceStatus] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [triggering, setTriggering] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRefresh, setConfirmRefresh] = useState<ResortItem | null>(null);
  const [confirmTrigger, setConfirmTrigger] = useState<ResortItem | null>(null);
  const { pushToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const overview = await getAdminSubscriptionOverview();
      setResorts(overview);
      setLatestInvoiceStatus(
        Object.fromEntries(overview.map((resort) => [resort.id, resort.latest_invoice_status ?? "none"])),
      );
      setError(null);
    } catch (err) {
      setResorts([]);
      setError("Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  const triggerInvoice = async (resort: ResortItem) => {
    setTriggering(resort.id);
    try {
      const result = await triggerSubscriptionInvoice(resort.id);
      pushToast({
        title: "Invoice triggered",
        description: `${resort.name} invoice created.`,
        tone: "success",
      });
      if (result.invoice_url) {
        pushToast({
          title: "Payment link ready",
          description: "Resort owner can complete payment using generated invoice link.",
          tone: "info",
        });
      }
      await load();
    } catch (err) {
      const msg = parseApiErrorMessage(err, "Unable to trigger subscription invoice.");
      pushToast({ title: "Trigger failed", description: msg, tone: "error" });
    } finally {
      setTriggering(null);
      setConfirmTrigger(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const refreshSub = async (resort: ResortItem) => {
    setRefreshing(resort.id);
    try {
      await apiClient.post(`/resorts/${resort.id}/subscriptions/refresh`);
      await load();
      pushToast({ title: "Subscription refreshed", description: `${resort.name} updated successfully.`, tone: "success" });
    } catch (err) {
      pushToast({ title: "Refresh failed", description: "Unable to refresh this subscription.", tone: "error" });
    } finally {
      setRefreshing(null);
      setConfirmRefresh(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <CreditCard size={24} className="text-skyBlue" />
          Subscriptions
        </h1>
        <p className="dash-page-sub">Review and refresh billing subscriptions for all resorts.</p>
      </div>

      <div className="md:hidden">
        {loading ? (
          <DashMobileTableSkeleton rows={5} />
        ) : error ? (
          <div className="dash-alert-error">{error}</div>
        ) : resorts.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">No resorts found.</div>
        ) : (
          <div className="space-y-3">
            {resorts.map((resort) => {
              const sub = resort.subscription;
              return (
                <DashMobileTableCard
                  key={resort.id}
                  title={resort.name}
                  fields={[
                    { label: "Plan", value: <span className="capitalize">{sub?.plan ?? "—"}</span> },
                    { label: "Active rooms", value: String(sub?.active_room_count ?? 0) },
                    {
                      label: "Monthly fee",
                      value: sub ? `₱${Number(sub.total_monthly_fee).toLocaleString()}` : "—",
                    },
                    {
                      label: "Status",
                      value: sub ? (
                        <span className={statusBadge[sub.status] ?? "dash-badge-slate"}>
                          {sub.status.replaceAll("_", " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">No subscription</span>
                      ),
                    },
                    {
                      label: "Latest invoice",
                      value: <span className="capitalize">{latestInvoiceStatus[resort.id] ?? "none"}</span>,
                    },
                    { label: "Next due", value: sub?.next_due_date ?? "—" },
                  ]}
                  actions={
                    <div className="flex w-full gap-2">
                      <button
                        type="button"
                        disabled={refreshing === resort.id}
                        onClick={() => setConfirmRefresh(resort)}
                        className="dash-btn-sm w-full justify-center"
                      >
                        <RefreshCw size={11} className={refreshing === resort.id ? "animate-spin" : ""} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        disabled={triggering === resort.id}
                        onClick={() => setConfirmTrigger(resort)}
                        className="dash-btn-accent w-full justify-center"
                      >
                        Trigger
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <DataTable
          headers={
            <>
              <th>Resort</th>
              <th>Plan</th>
              <th>Rooms</th>
              <th>Monthly fee</th>
              <th>Status</th>
              <th>Latest invoice</th>
              <th>Next due</th>
              <DashTableActionsHead srOnly>Row actions</DashTableActionsHead>
            </>
          }
        >
          <AsyncStatePanel loading={loading} error={error} isEmpty={resorts.length === 0} emptyText="No resorts found." withinTable colSpan={8}>
            {resorts.map((resort) => {
              const sub = resort.subscription;
              return (
                <tr key={resort.id} className="group">
                  <td className="font-semibold text-navy">{resort.name}</td>
                  <td className="capitalize text-zinc-700">{sub?.plan ?? "—"}</td>
                  <td className="text-zinc-600">{sub?.active_room_count ?? 0}</td>
                  <td className="text-zinc-700">
                    {sub ? `₱${Number(sub.total_monthly_fee).toLocaleString()}` : "—"}
                  </td>
                  <td>
                    {sub ? (
                      <span className={statusBadge[sub.status] ?? "dash-badge-slate"}>
                        {sub.status.replaceAll("_", " ")}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">No subscription</span>
                    )}
                  </td>
                  <td className="capitalize text-zinc-700">{latestInvoiceStatus[resort.id] ?? "none"}</td>
                  <td className="text-zinc-600">{sub?.next_due_date ?? "—"}</td>
                  <DashTableActionsCell>
                    <DashTableActionsInner>
                      <button
                        type="button"
                        disabled={refreshing === resort.id}
                        onClick={() => setConfirmRefresh(resort)}
                        className="dash-btn-sm"
                      >
                        <RefreshCw size={11} className={refreshing === resort.id ? "animate-spin" : ""} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        disabled={triggering === resort.id}
                        onClick={() => setConfirmTrigger(resort)}
                        className="dash-btn-accent"
                      >
                        Trigger Invoice
                      </button>
                    </DashTableActionsInner>
                  </DashTableActionsCell>
                </tr>
              );
            })}
          </AsyncStatePanel>
        </DataTable>
      </div>

      <ConfirmDialog
        open={Boolean(confirmRefresh)}
        title="Refresh subscription calculation?"
        description={
          confirmRefresh
            ? `Recalculate billing for ${confirmRefresh.name} using current active room count.`
            : "Recalculate billing."
        }
        confirmLabel="Refresh"
        loading={refreshing !== null}
        onCancel={() => setConfirmRefresh(null)}
        onConfirm={() => {
          if (confirmRefresh) void refreshSub(confirmRefresh);
        }}
      />
      <ConfirmDialog
        open={Boolean(confirmTrigger)}
        title="Trigger subscription invoice?"
        description={
          confirmTrigger
            ? `Create a payment invoice now for ${confirmTrigger.name}.`
            : "Create a payment invoice."
        }
        confirmLabel="Trigger invoice"
        loading={triggering !== null}
        onCancel={() => setConfirmTrigger(null)}
        onConfirm={() => {
          if (confirmTrigger) void triggerInvoice(confirmTrigger);
        }}
      />
    </div>
  );
}

