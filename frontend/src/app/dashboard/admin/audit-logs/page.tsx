"use client";

import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DataTable from "@/components/shared/DataTable";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import { AuditLog, getAuditLogs } from "@/lib/api/admin";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { extractLaravelMeta, nextSort, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useEffect, useState } from "react";

const SORT_FIRST: Record<string, SortDir> = {
  created_at: "desc",
  action: "asc",
  entity_type: "asc",
  entity_id: "desc",
  id: "desc",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [appliedAction, setAppliedAction] = useState("");
  const [appliedEntity, setAppliedEntity] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [perPage, setPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [error, setError] = useState<string | null>(null);
  const [openLogId, setOpenLogId] = useState<number | null>(null);

  const load = async (a: string, e: string, pg: number, pp: number, sb: string, sd: SortDir) => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        action: a || undefined,
        entityType: e || undefined,
        page: pg,
        perPage: pp,
        sort_by: sb,
        sort_dir: sd,
      });
      setLogs(data.data ?? []);
      setMeta(extractLaravelMeta(data));
      setError(null);
    } catch {
      setLogs([]);
      setMeta(null);
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", "", 1, perPage, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? logs.length;

  const onFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedAction(actionFilter);
    setAppliedEntity(entityFilter);
    setPage(1);
    void load(actionFilter, entityFilter, 1, perPage, sortBy, sortDir);
  };

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
    void load(appliedAction, appliedEntity, 1, perPage, n.key, n.dir);
  };

  const onPageChange = (p: number) => {
    setPage(p);
    void load(appliedAction, appliedEntity, p, perPage, sortBy, sortDir);
  };

  const onPerPageChange = (pp: number) => {
    setPerPage(pp);
    setPage(1);
    void load(appliedAction, appliedEntity, 1, pp, sortBy, sortDir);
  };

  const paginationFooter = !error && (
    <TablePaginationBar
      page={page}
      lastPage={lastPage}
      total={total}
      perPage={perPage}
      onPerPageChange={onPerPageChange}
      onPageChange={onPageChange}
      disabled={loading}
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <FileText size={24} className="text-skyBlue" />
          Audit logs
        </h1>
        <p className="dash-page-sub">System-wide activity log across all tenants and users.</p>

        <form onSubmit={onFilter} className="dash-filter-bar">
          <DashboardFilterSearch
            value={actionFilter}
            onChange={(v) => setActionFilter(sanitizeSearchQuery(v))}
            placeholder="Filter by action…"
            submitLabel="Filter"
          />
          <select className="dash-filter-select" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} aria-label="Entity type">
            <option value="">All entities</option>
            <option value="reservation">reservation</option>
            <option value="booking_lock">booking_lock</option>
            <option value="subscription">subscription</option>
            <option value="resort">resort</option>
            <option value="room">room</option>
            <option value="user">user</option>
          </select>
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
                log.metadata && Object.keys(log.metadata).length ? JSON.stringify(log.metadata) : "";
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
                            <p className="break-all font-mono text-[11px] text-zinc-600">
                              {metaStr.slice(0, 280)}
                              {metaStr.length > 280 ? "…" : ""}
                            </p>
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
        {paginationFooter ? <div className="dash-table-wrap overflow-hidden rounded-2xl">{paginationFooter}</div> : null}
      </div>

      <div className="hidden md:block">
        <DataTable
          footer={paginationFooter}
          headers={
            <>
              <SortableTh label="Timestamp" sortKey="created_at" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Action" sortKey="action" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Entity" sortKey="entity_type" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Entity ID" sortKey="entity_id" activeKey={sortBy} direction={sortDir} onSort={onSort} />
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
    </div>
  );
}
