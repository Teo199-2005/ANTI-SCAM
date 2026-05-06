"use client";

import DashCard from "@/components/dash/DashCard";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { getXenditLogs, XenditLog } from "@/lib/api/admin";
import { RefreshCw, Webhook } from "lucide-react";
import { useEffect, useState } from "react";

export default function XenditLogsPage() {
  const [logs, setLogs] = useState<XenditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const perPage = 20;

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getXenditLogs({ perPage, page: p });
      setLogs(res.data);
      setTotal(res.meta?.total ?? 0);
      setError(null);
    } catch (err) {
      setLogs([]);
      setTotal(0);
      setError("Failed to load Xendit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(page); }, [page]);

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

      <DashCard className="overflow-hidden p-0">
        {loading ? (
          <>
            <div className="md:hidden p-4"><DashMobileTableSkeleton rows={5} /></div>
            <div className="hidden md:block space-y-2 p-4">{[1,2,3,4,5].map(i=><div key={i} className="h-12 animate-pulse rounded-xl bg-softGray"/>)}</div>
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
                  title={<span className="font-mono text-xs break-all">{log.event_id}</span>}
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
                    <th>Event ID</th>
                    <th>Invoice ID</th>
                    <th>Event Type</th>
                    <th>Processed At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
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
              <button className="dash-btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="dash-btn-sm" disabled={page * perPage >= total} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        ) : null}
      </DashCard>
    </div>
  );
}

