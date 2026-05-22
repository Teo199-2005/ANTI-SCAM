"use client";

import DashCard from "@/components/dash/DashCard";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { BulkSelectMobile, BulkSelectTd, BulkSelectTh } from "@/components/shared/BulkSelectCheckbox";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { useToast } from "@/components/shared/ToastProvider";
import { getXenditLogs, XenditLog } from "@/lib/api/admin";
import { bulkDeleteToastDescriptionGeneric, bulkDeleteXenditLogs } from "@/lib/api/bulkDelete";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { RefreshCw, Webhook } from "lucide-react";
import { useEffect, useState } from "react";

export default function XenditLogsPage() {
  const { pushToast } = useToast();
  const [logs, setLogs] = useState<XenditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const perPage = 20;

  const bulk = useBulkSelection(logs, (log) => log.id);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getXenditLogs({ perPage, page: p });
      setLogs(res.data);
      setTotal(res.meta?.total ?? 0);
      setError(null);
    } catch {
      setLogs([]);
      setTotal(0);
      setError("Failed to load Xendit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onPageChange = (p: number) => {
    bulk.clear();
    setPage(p);
  };

  const onBulkDelete = async () => {
    const ids = bulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteXenditLogs(ids);
      bulk.clear();
      pushToast({
        title: result.failed.length ? "Bulk delete completed with errors" : "Payment logs deleted",
        description: bulkDeleteToastDescriptionGeneric(result, "log"),
        tone: result.failed.length ? "warning" : "success",
      });
      await load(page);
    } catch (err) {
      pushToast({
        title: "Bulk delete failed",
        description: parseApiErrorMessage(err, "Unable to delete selected payment logs."),
        tone: "error",
      });
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="dash-filter-bar w-full md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <Webhook size={22} className="text-skyBlue" /> Xendit Payment Logs
          </h1>
          <p className="dash-page-sub">Webhook events received from Xendit for all reservations.</p>
        </div>
        <button type="button" className="dash-btn-sm shrink-0" onClick={() => void load(page)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <BulkActionBar
        count={bulk.selectedCount}
        onClear={bulk.clear}
        onDelete={() => setConfirmBulkDelete(true)}
        deleting={bulkDeleting}
        deleteLabel="Delete selected logs"
      />

      <DashCard className="overflow-hidden p-0">
        {loading ? (
          <>
            <div className="md:hidden p-4"><DashMobileTableSkeleton rows={5} /></div>
            <div className="hidden md:block space-y-2 p-4">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-softGray" />)}</div>
          </>
        ) : error ? (
          <p className="px-6 py-10 text-center text-sm text-rose-700">{error}</p>
        ) : logs.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">No Xendit webhook events recorded yet.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3 p-4">
              {logs.map((log) => (
                <DashMobileTableCard
                  key={log.id}
                  title={
                    <span className="inline-flex items-start gap-2">
                      <BulkSelectMobile
                        checked={bulk.isSelected(log.id)}
                        onChange={() => bulk.toggle(log.id)}
                        ariaLabel={`Select log ${log.id}`}
                      />
                      <span className="font-mono text-xs break-all">{log.event_id}</span>
                    </span>
                  }
                  fields={[
                    {
                      label: "Type",
                      value: (
                        <span className={log.event_type === "invoice.paid" ? "dash-badge-emerald" : log.event_type?.includes("fail") ? "dash-badge-rose" : "dash-badge-slate"}>
                          {log.event_type ?? "—"}
                        </span>
                      ),
                    },
                    { label: "Processed", value: new Date(log.processed_at).toLocaleString() },
                    { label: "Invoice", value: <span className="font-mono text-xs break-all">{log.invoice_id ?? "—"}</span> },
                  ]}
                />
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="dash-table">
                <thead>
                  <tr>
                    <BulkSelectTh
                      checked={bulk.isAllSelected}
                      indeterminate={bulk.isSomeSelected}
                      onChange={() => (bulk.isAllSelected ? bulk.clear() : bulk.selectAll())}
                    />
                    <th>Event ID</th>
                    <th>Invoice ID</th>
                    <th>Event Type</th>
                    <th>Processed At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <BulkSelectTd
                        checked={bulk.isSelected(log.id)}
                        onChange={() => bulk.toggle(log.id)}
                        ariaLabel={`Select log ${log.id}`}
                      />
                      <td className="font-mono text-xs text-navy">{log.event_id.slice(0, 24)}…</td>
                      <td className="font-mono text-xs text-zinc-600">{log.invoice_id ?? "—"}</td>
                      <td>
                        <span className={log.event_type === "invoice.paid" ? "dash-badge-emerald" : log.event_type?.includes("fail") ? "dash-badge-rose" : "dash-badge-slate"}>
                          {log.event_type ?? "—"}
                        </span>
                      </td>
                      <td className="text-zinc-500">{new Date(log.processed_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {total > perPage ? (
          <div className="flex items-center justify-between border-t border-softBorder px-6 py-3">
            <p className="text-xs text-zinc-400">Showing {Math.min(page * perPage, total)} of {total}</p>
            <div className="flex gap-2">
              <button className="dash-btn-sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button>
              <button className="dash-btn-sm" disabled={page * perPage >= total} onClick={() => onPageChange(page + 1)}>Next</button>
            </div>
          </div>
        ) : null}
      </DashCard>

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected payment logs?"
        description={`Permanently remove ${bulk.selectedCount} Xendit webhook log${bulk.selectedCount === 1 ? "" : "s"} from this page. This cannot be undone.`}
        confirmLabel="Delete selected"
        tone="danger"
        loading={bulkDeleting}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => void onBulkDelete()}
      />
    </div>
  );
}
