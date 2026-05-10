"use client";

import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import AdminCreateUserModal from "@/components/dashboard/AdminCreateUserModal";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import SortableTh from "@/components/shared/SortableTh";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import { useToast } from "@/components/shared/ToastProvider";
import { extractLaravelMeta, nextSort, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";
import { Search, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  createdAt?: string;
  tenant_id: number | null;
};

type PaginatedEnvelope = {
  success: boolean;
  data: User[] | { data: User[]; meta?: LaravelTableMeta };
};

const rolePill: Record<string, string> = {
  admin: "dash-badge-rose",
  resort_owner: "dash-badge-sky",
  marketing: "dash-badge-violet",
  admin_staff: "dash-badge-orange",
  user: "dash-badge-slate",
  client: "dash-badge-slate",
};

const SORT_FIRST: Record<string, SortDir> = {
  name: "asc",
  email: "asc",
  role: "asc",
  created_at: "desc",
};

function roleLabel(role: string): string {
  return role.replaceAll("_", " ");
}

function avatarSrc(name: string, email: string): string {
  const label = name.trim() || email.trim() || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=0B5563&color=FFFFFF&bold=true&format=png&size=96`;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  const load = async (q: string, pg: number, pp: number, sb: string, sd: SortDir) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/users", {
        params: {
          search: q || undefined,
          perPage: pp,
          page: pg,
          sort_by: sb,
          sort_dir: sd,
        },
      });
      const payload = data.data;
      const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
      const m = extractLaravelMeta(payload);
      setUsers(rows);
      setMeta(m);
      setError(null);
    } catch (err) {
      setUsers([]);
      setMeta(null);
      setError(parseApiErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", 1, perPage, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? users.length;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(query);
    setPage(1);
    void load(query, 1, perPage, sortBy, sortDir);
  };

  const onSort = (key: string) => {
    const n = nextSort(key, sortBy, sortDir, SORT_FIRST[key] ?? "asc");
    setSortBy(n.key);
    setSortDir(n.dir);
    setPage(1);
    void load(appliedQuery, 1, perPage, n.key, n.dir);
  };

  const onPageChange = (p: number) => {
    setPage(p);
    void load(appliedQuery, p, perPage, sortBy, sortDir);
  };

  const onPerPageChange = (pp: number) => {
    setPerPage(pp);
    setPage(1);
    void load(appliedQuery, 1, pp, sortBy, sortDir);
  };

  const onDelete = async (id: number) => {
    setDeleting(id);
    try {
      await apiClient.delete(`/users/${id}`);
      await load(appliedQuery, page, perPage, sortBy, sortDir);
      pushToast({ title: "User deleted", tone: "success" });
    } catch (err) {
      pushToast({
        title: "Delete failed",
        description: parseApiErrorMessage(err, "Unable to delete this user right now."),
        tone: "error",
      });
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
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
      <div className="dash-page-header">
        <h1 className="dash-page-title flex items-center gap-2">
          <Users size={24} className="text-skyBlue" />
          All users
        </h1>
        <p className="dash-page-sub">Manage platform users and their roles.</p>

        <form onSubmit={onSearch} className="dash-filter-bar mt-5">
          <div className="relative min-w-[200px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              className="dash-input pl-9"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(sanitizeSearchQuery(e.target.value))}
            />
          </div>
          <button type="submit" className="dash-btn-primary shrink-0">
            Search
          </button>
          <button type="button" className="dash-btn-sm inline-flex shrink-0 items-center justify-center gap-1.5" onClick={() => setCreateOpen(true)}>
            <UserPlus size={14} />
            Add user
          </button>
        </form>
      </div>

      <div className="md:hidden">
        {loading ? (
          <DashMobileTableSkeleton rows={5} />
        ) : error ? (
          <div className="dash-alert-error">{error}</div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-softBorder bg-softCard p-8 text-center text-sm text-zinc-600">No users found.</div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <DashMobileTableCard
                key={u.id}
                title={
                  <span className="inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarSrc(u.name, u.email)}
                      alt={`${u.name} avatar`}
                      className="h-7 w-7 rounded-full border border-softBorder object-cover"
                      loading="lazy"
                    />
                    <span>{u.name}</span>
                  </span>
                }
                fields={[
                  { label: "Email", value: <span className="break-all">{u.email}</span> },
                  {
                    label: "Role",
                    value: <span className={`dash-role-badge ${rolePill[u.role] ?? rolePill.user}`}>{roleLabel(u.role)}</span>,
                  },
                  {
                    label: "Joined",
                    value:
                      u.created_at || u.createdAt ? new Date(u.created_at ?? u.createdAt ?? "").toLocaleDateString() : "—",
                  },
                ]}
                actions={
                  <button
                    type="button"
                    disabled={deleting === u.id}
                    onClick={() => setConfirmDelete(u)}
                    className="dash-btn-danger w-full justify-center"
                  >
                    <Trash2 size={14} />
                    Delete user
                  </button>
                }
              />
            ))}
          </div>
        )}
        {paginationFooter ? <div className="dash-table-wrap overflow-hidden rounded-2xl">{paginationFooter}</div> : null}
      </div>

      <div className="hidden md:block">
        <DataTable
          footer={paginationFooter}
          headers={
            <>
              <SortableTh label="Name" sortKey="name" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Email" sortKey="email" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Role" sortKey="role" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <SortableTh label="Joined" sortKey="created_at" activeKey={sortBy} direction={sortDir} onSort={onSort} />
              <DashTableActionsHead srOnly>Row actions</DashTableActionsHead>
            </>
          }
        >
          <AsyncStatePanel loading={loading} error={error} isEmpty={users.length === 0} emptyText="No users found." withinTable colSpan={5}>
            {users.map((u) => (
              <tr key={u.id} className="group">
                <td>
                  <div className="inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarSrc(u.name, u.email)}
                      alt={`${u.name} avatar`}
                      className="h-8 w-8 rounded-full border border-softBorder object-cover"
                      loading="lazy"
                    />
                    <span className="font-semibold text-navy">{u.name}</span>
                  </div>
                </td>
                <td className="text-zinc-600">{u.email}</td>
                <td>
                  <span className={`dash-role-badge ${rolePill[u.role] ?? rolePill.user}`}>{roleLabel(u.role)}</span>
                </td>
                <td className="text-zinc-600">
                  {u.created_at || u.createdAt ? new Date(u.created_at ?? u.createdAt ?? "").toLocaleDateString() : "—"}
                </td>
                <DashTableActionsCell>
                  <DashTableActionsInner>
                    <button type="button" disabled={deleting === u.id} onClick={() => setConfirmDelete(u)} className="dash-btn-danger">
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </DashTableActionsInner>
                </DashTableActionsCell>
              </tr>
            ))}
          </AsyncStatePanel>
        </DataTable>
      </div>

      <AdminCreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void load(appliedQuery, page, perPage, sortBy, sortDir)}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete user?"
        description={
          confirmDelete ? `Delete ${confirmDelete.name}. This action cannot be undone.` : "This action cannot be undone."
        }
        confirmLabel="Delete"
        tone="danger"
        loading={deleting !== null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void onDelete(confirmDelete.id);
        }}
      />
    </div>
  );
}
