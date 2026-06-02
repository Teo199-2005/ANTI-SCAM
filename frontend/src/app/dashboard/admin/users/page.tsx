"use client";

import LocationFilterBar, {
  emptyLocationFilter,
  locationFilterToParams,
  type LocationFilterValue,
} from "@/components/locations/LocationFilterBar";
import { apiClient } from "@/lib/api/client";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import AdminCreateUserModal from "@/components/dashboard/AdminCreateUserModal";
import AdminEditUserModal, { type AdminEditableUser } from "@/components/dashboard/AdminEditUserModal";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { BulkSelectMobile, BulkSelectTd, BulkSelectTh } from "@/components/shared/BulkSelectCheckbox";
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
import { bulkDeleteToastDescription, bulkDeleteUsers } from "@/lib/api/bulkDelete";
import { extractLaravelMeta, nextSort, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { Pencil, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  mailing_province_psgc?: string | null;
  mailing_city_municipality_psgc?: string | null;
  mailing_barangay_name?: string | null;
  mailing_location_label?: string | null;
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
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminEditableUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(emptyLocationFilter);
  const { pushToast } = useToast();

  const bulk = useBulkSelection(users, (u) => u.id);

  const load = async (
    q: string,
    pg: number,
    pp: number,
    sb: string,
    sd: SortDir,
    loc: LocationFilterValue = locationFilter,
  ) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<PaginatedEnvelope>("/users", {
        params: {
          search: q || undefined,
          perPage: pp,
          page: pg,
          sort_by: sb,
          sort_dir: sd,
          ...locationFilterToParams(loc),
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

  const onBulkDelete = async () => {
    const ids = bulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteUsers(ids);
      await load(appliedQuery, page, perPage, sortBy, sortDir);
      bulk.clear();
      pushToast({
        title: result.failed.length ? "Bulk delete completed with errors" : "Users deleted",
        description: bulkDeleteToastDescription(result),
        tone: result.failed.length ? "warning" : "success",
      });
    } catch (err) {
      pushToast({
        title: "Bulk delete failed",
        description: parseApiErrorMessage(err, "Unable to delete selected users."),
        tone: "error",
      });
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
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

        <form onSubmit={onSearch} className="dash-filter-bar">
          <DashboardFilterSearch
            value={query}
            onChange={(v) => setQuery(sanitizeSearchQuery(v))}
            placeholder="Search by name or email…"
            wide
          />
          <button
            type="button"
            className="dash-filter-clear inline-flex items-center gap-1"
            onClick={() => setCreateOpen(true)}
          >
            <UserPlus size={13} aria-hidden />
            Add user
          </button>
          <LocationFilterBar
            label="Location"
            value={locationFilter}
            onChange={(next) => {
              setLocationFilter(next);
              setPage(1);
              void load(appliedQuery, 1, perPage, sortBy, sortDir, next);
            }}
          />
        </form>
      </div>

      <BulkActionBar
        count={bulk.selectedCount}
        onClear={bulk.clear}
        onDelete={() => setConfirmBulkDelete(true)}
        deleting={bulkDeleting}
        deleteLabel="Delete selected users"
      />

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
                    <BulkSelectMobile
                      checked={bulk.isSelected(u.id)}
                      onChange={() => bulk.toggle(u.id)}
                      ariaLabel={`Select ${u.name}`}
                    />
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
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setEditUser(u)}
                      className="dash-btn-sm w-full justify-center"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </div>
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
          leadingHeader={
            <BulkSelectTh
              checked={bulk.isAllSelected}
              indeterminate={bulk.isSomeSelected}
              onChange={() => (bulk.isAllSelected ? bulk.clear() : bulk.selectAll())}
              disabled={loading || users.length === 0}
            />
          }
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
          <AsyncStatePanel loading={loading} error={error} isEmpty={users.length === 0} emptyText="No users found." withinTable colSpan={6}>
            {users.map((u) => (
              <tr key={u.id} className="group">
                <BulkSelectTd
                  checked={bulk.isSelected(u.id)}
                  onChange={() => bulk.toggle(u.id)}
                  ariaLabel={`Select ${u.name}`}
                />
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
                    <button type="button" onClick={() => setEditUser(u)} className="dash-btn-sm">
                      <Pencil size={14} />
                      Edit
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

      <AdminEditUserModal
        open={Boolean(editUser)}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={() => void load(appliedQuery, page, perPage, sortBy, sortDir)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected users?"
        description={`Delete ${bulk.selectedCount} user${bulk.selectedCount === 1 ? "" : "s"} on this page. This cannot be undone.`}
        confirmLabel="Delete selected"
        tone="danger"
        loading={bulkDeleting}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => void onBulkDelete()}
      />
    </div>
  );
}
