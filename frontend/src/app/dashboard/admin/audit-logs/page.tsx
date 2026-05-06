"use client";

import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DataTable from "@/components/shared/DataTable";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { getAuditLogs, AuditLog } from "@/lib/api/admin";
import { ChevronDown, ChevronUp, FileText, Search } from "lucide-react";
import { useEffect, useState } from "react";

type Paginated = {
  data: AuditLog[];
  meta?: { current_page: number; last_page: number; total: number };
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [openLogId, setOpenLogId] = useState<number | null>(null);

  const load = async (a: string, e: string, pg: number) => {
    setLoading(true);
    try {
      const data: Paginated = await getAuditLogs({
        action: a || undefined,
        entityType: e || undefined,
        page: pg,
        perPage: 25,
      });
      setLogs(data.data ?? []);
      setLastPage(data.meta?.last_page ?? 1);
      setError(null);
    } catch (err) {
      setLogs([]);
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", "", 1);
  }, []);

  const onFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load(actionFilter, entityFilter, 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <FileText size={24} className="text-skyBlue" />
          Audit logs
        </h1>
        <p className="dash-page-sub">System-wide activity log across all tenants and users.</p>

        <form onSubmit={onFilter} className="dash-filter-bar mt-5">
          <div className="relative min-w-[180px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              className="dash-input pl-9"
              placeholder="Filter by action…"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            />
          </div>
          <select className="dash-input min-w-[160px]" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
            <option value="">All entities</option>
            <option value="reservation">reservation</option>
            <option value="booking_lock">booking_lock</option>
            <option value="subscription">subscription</option>
            <option value="resort">resort</option>
            <option value="room">room</option>
            <option value="user">user</option>
          </select>
          <button type="submit" className="dash-btn-primary shrink-0">
            Filter
          </button>
        </form>
      </div>

      <div className="md:hidden">
        {loading ? (
          <DashMobileTableSkeleton rows={5} />
        ) : error ? (
          <div className="dash-alert-error">{error}</div>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">No audit logs found.</div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const expanded = openLogId === log.id;
              const metaStr =
                log.metadata && Object.keys(log.metadata).length
                  ? JSON.stringify(log.metadata)
                  : "";
              return (
                <DashMobileTableCard
                  key={log.id}
                  title={<span className="dash-badge-sky text-xs">{log.action}</span>}
                  fields={[
                    { label: "Time", value: new Date(log.created_at).toLocaleString() },
                    {
                      label: "Summary",
                      value: `${log.entity_type}${log.entity_id != null ? ` · #${log.entity_id}` : ""}`,
                    },
                  ]}
                  actions={
                    <>
                      <button
                        type="button"
                        className="dash-btn-sm flex w-full items-center justify-center gap-2"
                        onClick={() => setOpenLogId(expanded ? null : log.id)}
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expanded ? "Hide details" : "View details"}
                      </button>
                      {expanded ? (
                        <div className="space-y-2 border-t border-softBorder pt-3 text-dash-sm text-zinc-700">
                          <p>
                            <span className="font-semibold text-zinc-500">User</span> {log.user_id ?? "system"}
                            {log.tenant_id != null ? (
                              <>
                                {" "}
                                · <span className="font-semibold text-zinc-500">Tenant</span> {log.tenant_id}
                              </>
                            ) : null}
                          </p>
                          {metaStr ? (
                            <p className="break-all font-mono text-[11px] text-zinc-600">{metaStr.slice(0, 280)}{metaStr.length > 280 ? "…" : ""}</p>
                          ) : null}
                        </div>
                      ) : null}
                    </>
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
              <th>Timestamp</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>User ID</th>
            </>
          }
        >
          <AsyncStatePanel loading={loading} error={error} isEmpty={logs.length === 0} emptyText="No audit logs found." withinTable colSpan={5}>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="font-mono text-xs text-zinc-600">{new Date(log.created_at).toLocaleString()}</td>
                <td>
                  <span className="dash-badge-sky">{log.action}</span>
                </td>
                <td className="text-zinc-700">{log.entity_type}</td>
                <td className="text-zinc-600">{log.entity_id ?? "—"}</td>
                <td className="text-zinc-600">{log.user_id ?? "system"}</td>
              </tr>
            ))}
          </AsyncStatePanel>
        </DataTable>
      </div>

      {lastPage > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => { const next = page - 1; setPage(next); void load(actionFilter, entityFilter, next); }}
            className="dash-btn-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-zinc-600">
            Page {page} of {lastPage}
          </span>
          <button
            disabled={page >= lastPage}
            onClick={() => { const next = page + 1; setPage(next); void load(actionFilter, entityFilter, next); }}
            className="dash-btn-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}

