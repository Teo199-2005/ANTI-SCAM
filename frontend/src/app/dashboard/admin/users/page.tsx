"use client";

import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DataTable from "@/components/shared/DataTable";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import { useToast } from "@/components/shared/ToastProvider";
import { Search, Trash2, Users } from "lucide-react";
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
  data: User[] | { data: User[]; meta?: { current_page: number; last_page: number; total: number } };
};

const rolePill: Record<string, string> = {
  admin:        "dash-badge-rose",
  resort_owner: "dash-badge-sky",
  marketing:    "dash-badge-violet",
  admin_staff:  "dash-badge-orange",
  user:         "dash-badge-slate",
  client:       "dash-badge-slate",
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
  const [lastPage, setLastPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  const load = async (q: string, pg: number) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/users", {
        params: { search: q || undefined, perPage: 20, page: pg },
      });
      const payload = data.data;
      const users = Array.isArray(payload) ? payload : (payload?.data ?? []);
      const meta = Array.isArray(payload) ? undefined : payload?.meta;
      setUsers(users);
      setLastPage(meta?.last_page ?? 1);
      setError(null);
    } catch (err) {
      setUsers([]);
      setError(parseApiErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", 1);
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(query);
    setPage(1);
    void load(query, 1);
  };

  const onDelete = async (id: number) => {
    setDeleting(id);
    try {
      await apiClient.delete(`/users/${id}`);
      await load(appliedQuery, page);
      pushToast({ title: "User deleted", tone: "success" });
    } catch (err) {
      pushToast({ title: "Delete failed", description: parseApiErrorMessage(err, "Unable to delete this user right now."), tone: "error" });
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

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
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="dash-btn-primary shrink-0">
            Search
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
                    value: u.created_at || u.createdAt ? new Date(u.created_at ?? u.createdAt ?? "").toLocaleDateString() : "—",
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
      </div>

      <div className="hidden md:block">
        <DataTable
          headers={
            <>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
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
                    <button
                      type="button"
                      disabled={deleting === u.id}
                      onClick={() => setConfirmDelete(u)}
                      className="dash-btn-danger"
                    >
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

      {lastPage > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => { const next = page - 1; setPage(next); void load(appliedQuery, next); }}
            className="dash-btn-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-zinc-600">
            Page {page} of {lastPage}
          </span>
          <button
            disabled={page >= lastPage}
            onClick={() => { const next = page + 1; setPage(next); void load(appliedQuery, next); }}
            className="dash-btn-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete user?"
        description={
          confirmDelete
            ? `Delete ${confirmDelete.name}. This action cannot be undone.`
            : "This action cannot be undone."
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

