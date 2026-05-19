"use client";

import DashCard from "@/components/dash/DashCard";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { BulkSelectMobile, BulkSelectTd, BulkSelectTh } from "@/components/shared/BulkSelectCheckbox";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import DashMobileTableCard, { DashMobileTableSkeleton } from "@/components/shared/DashMobileTableCard";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import { useToast } from "@/components/shared/ToastProvider";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
import Button from "@/components/ui/Button";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { apiClient } from "@/lib/api/client";
import { bulkDeleteResortGuests, bulkDeleteToastDescriptionGeneric } from "@/lib/api/bulkDelete";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import {
  INPUT_MAX,
  sanitizeEmailTyping,
  sanitizePersonName,
  sanitizePhoneInput,
  sanitizeSearchQuery,
} from "@/lib/inputRestrictions";
import {
  Eye,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { formatPhp } from "@/lib/formatPhp";

type Guest = {
  id: number;
  guestKey: string;
  name: string;
  email: string | null;
  phone: string | null;
  reservationCount: number;
  activeReservationCount?: number;
  lastCheckIn: string | null;
  lastCheckOut: string | null;
  totalSpent: number;
  firstBooking: string | null;
  hasLoginAccount?: boolean;
};

type GuestDetail = Guest & { hasLoginAccount: boolean };

type ReservationRow = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  reservationFee: number;
  room?: { id: number; name: string };
};

type ApiEnvelope<T> = { success: boolean; data: T };

const blankCreate = {
  name: "",
  email: "",
  phone: "",
  password: "",
  password_confirmation: "",
};

function extractGuestRows(payload: unknown): Guest[] {
  if (Array.isArray(payload)) return payload as Guest[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data: Guest[] }).data)) {
    return (payload as { data: Guest[] }).data;
  }
  return [];
}

function extractReservationRows(payload: unknown): ReservationRow[] {
  if (Array.isArray(payload)) return payload as ReservationRow[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data: ReservationRow[] }).data)) {
    return (payload as { data: ReservationRow[] }).data;
  }
  return [];
}

function formatStay(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn) return "—";
  return `${checkIn.slice(0, 10)} → ${checkOut ? checkOut.slice(0, 10) : "?"}`;
}

function guestDeleteConfirmBody(
  label: string,
  activeCount: number,
  hasLogin: boolean,
): ReactNode {
  return (
    <div className="space-y-3 text-sm text-zinc-600">
      <p>
        Remove <strong className="font-medium text-navy">{label}</strong> from your guest directory? This cannot be
        undone.
      </p>
      <ul className="list-disc space-y-1.5 pl-5">
        {hasLogin ? <li>Their login account will be permanently deleted.</li> : null}
        {activeCount > 0 ? (
          <li>
            <strong className="font-medium text-dsError">
              {activeCount} active reservation{activeCount === 1 ? "" : "s"}
            </strong>{" "}
            (pending or confirmed) will be <strong className="font-medium text-dsError">cancelled</strong>.
          </li>
        ) : (
          <li>No active reservations will be cancelled.</li>
        )}
        <li>Contact details on past bookings will be cleared; booking records remain for your records.</li>
      </ul>
    </div>
  );
}

function sumActiveReservations(guestList: Guest[]): number {
  return guestList.reduce((sum, g) => sum + (g.activeReservationCount ?? 0), 0);
}

function Modal({
  title,
  subtitle,
  onClose,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalPanel title={title} subtitle={subtitle} onClose={onClose} wide={wide}>
        {children}
      </ModalPanel>
    </ModalOverlay>
  );
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-zinc-900/40 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

function ModalPanel({
  title,
  subtitle,
  onClose,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`flex max-h-[min(92vh,720px)] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl sm:rounded-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
        <div>
          <h2 className="font-dash text-lg font-semibold text-navy">{title}</h2>
          {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        <ModalCloseButton onClose={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
    </div>
  );
}

export default function ResortGuestsPage() {
  const { pushToast } = useToast();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<GuestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<ReservationRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(blankCreate);
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmSingleDelete, setConfirmSingleDelete] = useState<Guest | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ApiEnvelope<unknown>>("/resort/guests", {
        params: { search: q || undefined, perPage: 100 },
      });
      setGuests(extractGuestRows(data.data));
    } catch {
      setError("Failed to load guest list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadReservations = async (guestKey: string) => {
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const { data } = await apiClient.get<ApiEnvelope<unknown>>(
        `/resort/guests/${encodeURIComponent(guestKey)}/reservations`,
        { params: { perPage: 100 } },
      );
      setHistoryRows(extractReservationRows(data.data));
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openDetail = async (g: Guest) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    void loadReservations(g.guestKey);
    try {
      const { data } = await apiClient.get<ApiEnvelope<GuestDetail>>(
        `/resort/guests/${encodeURIComponent(g.guestKey)}`,
      );
      setDetail(data.data);
    } catch (err) {
      pushToast({ title: "Could not load guest", description: parseApiErrorMessage(err), tone: "error" });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (g: Guest) => {
    setEditGuest(g);
    setEditForm({
      name: g.name,
      email: g.email ?? "",
      phone: g.phone ?? "",
      password: "",
      password_confirmation: "",
    });
    setEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await apiClient.post<ApiEnvelope<GuestDetail>>("/resort/guests", {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || null,
        password: createForm.password,
        password_confirmation: createForm.password_confirmation,
      });
      setCreateOpen(false);
      setCreateForm(blankCreate);
      pushToast({
        title: "Guest account created",
        description: `${data.data.name} can log in with the email and password you set.`,
        tone: "success",
      });
      await load(search);
    } catch (err) {
      pushToast({ title: "Could not create guest", description: parseApiErrorMessage(err), tone: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGuest) return;
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
      };
      if (editForm.password) {
        payload.password = editForm.password;
        payload.password_confirmation = editForm.password_confirmation;
      }
      const { data } = await apiClient.patch<ApiEnvelope<GuestDetail>>(
        `/resort/guests/${encodeURIComponent(editGuest.guestKey)}`,
        payload,
      );
      setEditOpen(false);
      if (detailOpen && detail?.guestKey === editGuest.guestKey) {
        setDetail(data.data);
        if (data.data.guestKey !== editGuest.guestKey) void loadReservations(data.data.guestKey);
      }
      setEditGuest(null);
      pushToast({ title: "Guest updated", tone: "success" });
      await load(search);
    } catch (err) {
      pushToast({ title: "Update failed", description: parseApiErrorMessage(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (g: Guest) => {
    setDeletingKey(g.guestKey);
    try {
      const { data } = await apiClient.delete<ApiEnvelope<{ cancelledReservations?: number }>>(
        `/resort/guests/${encodeURIComponent(g.guestKey)}`,
      );
      const cancelled = data.data?.cancelledReservations ?? 0;
      pushToast({
        title: "Guest removed",
        description:
          cancelled > 0
            ? `${cancelled} active reservation${cancelled === 1 ? "" : "s"} cancelled. Login and contact details cleared.`
            : "Login and contact details cleared from your directory.",
        tone: "success",
      });
      if (detailOpen && detail?.guestKey === g.guestKey) setDetailOpen(false);
      setConfirmSingleDelete(null);
      await load(search);
    } catch (err) {
      pushToast({ title: "Delete failed", description: parseApiErrorMessage(err), tone: "error" });
    } finally {
      setDeletingKey(null);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(query);
    void load(query);
  };

  const filtered = guests.filter((g) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(s) ||
      g.email?.toLowerCase().includes(s) ||
      g.phone?.includes(s)
    );
  });

  const bulk = useBulkSelection(filtered, (g) => g.guestKey);

  const selectedGuestsForDelete = filtered.filter((g) => bulk.selectedIds.includes(g.guestKey));
  const bulkActiveReservations = sumActiveReservations(selectedGuestsForDelete);
  const bulkHasLogin = selectedGuestsForDelete.some((g) => g.hasLoginAccount);

  const onBulkDelete = async () => {
    const keys = bulk.selectedIds;
    if (keys.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteResortGuests(keys);
      if (detailOpen && detail && keys.includes(detail.guestKey)) setDetailOpen(false);
      await load(search);
      bulk.clear();
      const toastDesc = bulkDeleteToastDescriptionGeneric(result, "guest");
      pushToast({
        title:
          result.failed.length === 0
            ? result.deleted === 1
              ? "Guest removed"
              : "Guests removed"
            : result.deleted === 0
              ? "Could not remove guests"
              : "Some guests were not removed",
        description: toastDesc,
        tone: result.failed.length === 0 ? "success" : result.deleted === 0 ? "error" : "warning",
      });
    } catch (err) {
      pushToast({
        title: "Bulk delete failed",
        description: parseApiErrorMessage(err, "Unable to remove selected guests."),
        tone: "error",
      });
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <Users size={24} className="text-skyBlue" /> Guest Directory
          </h1>
          <p className="dash-page-sub">
            View-only directory of guests who booked your resort (from reservations).
          </p>
        </div>
      </div>

      <div className="dash-filter-bar">
        <form onSubmit={onSearch} className="contents">
          <DashboardFilterSearch
            value={query}
            onChange={(v) => setQuery(sanitizeSearchQuery(v))}
            placeholder="Search by name, email, or phone…"
            wide
          />
        </form>
        {!loading && (
          <span className="ml-auto shrink-0 rounded-full bg-navy/8 px-3 py-1 text-xs font-medium text-navy">
            {filtered.length} guest{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">{error}</div>
      ) : (
        <GuestList
          loading={loading}
          filtered={filtered}
          search={search}
          deletingKey={deletingKey}
          bulk={bulk}
          onDetail={(g) => void openDetail(g)}
          readOnly
        />
      )}

      <ConfirmDialog
        open={confirmSingleDelete !== null}
        title="Remove guest from directory?"
        confirmLabel="Remove guest"
        tone="danger"
        loading={deletingKey !== null}
        onCancel={() => setConfirmSingleDelete(null)}
        onConfirm={() => {
          if (confirmSingleDelete) void handleDelete(confirmSingleDelete);
        }}
      >
        {confirmSingleDelete
          ? guestDeleteConfirmBody(
              confirmSingleDelete.name || confirmSingleDelete.email || "this guest",
              confirmSingleDelete.activeReservationCount ?? 0,
              Boolean(confirmSingleDelete.hasLoginAccount),
            )
          : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Remove selected guests?"
        confirmLabel="Remove selected"
        tone="danger"
        loading={bulkDeleting}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => void onBulkDelete()}
      >
        {bulk.selectedCount > 0
          ? guestDeleteConfirmBody(
              `${bulk.selectedCount} guest${bulk.selectedCount === 1 ? "" : "s"}`,
              bulkActiveReservations,
              bulkHasLogin,
            )
          : null}
      </ConfirmDialog>

      {createOpen ? (
        <Modal
          title="Create guest account"
          subtitle="Guest can sign in at /login with this email and password."
          onClose={() => setCreateOpen(false)}
        >
          <GuestForm
            mode="create"
            name={createForm.name}
            email={createForm.email}
            phone={createForm.phone}
            password={createForm.password}
            passwordConfirmation={createForm.password_confirmation}
            saving={creating}
            saveLabel="Create account"
            onCancel={() => setCreateOpen(false)}
            onNameChange={(v) => setCreateForm((f) => ({ ...f, name: v }))}
            onEmailChange={(v) => setCreateForm((f) => ({ ...f, email: v }))}
            onPhoneChange={(v) => setCreateForm((f) => ({ ...f, phone: v }))}
            onPasswordChange={(v) => setCreateForm((f) => ({ ...f, password: v }))}
            onPasswordConfirmationChange={(v) => setCreateForm((f) => ({ ...f, password_confirmation: v }))}
            onSubmit={(e) => void handleCreate(e)}
          />
        </Modal>
      ) : null}

      {editOpen && editGuest ? (
        <Modal title="Edit guest" subtitle={editGuest.name} onClose={() => setEditOpen(false)}>
          <GuestForm
            mode="edit"
            name={editForm.name}
            email={editForm.email}
            phone={editForm.phone}
            password={editForm.password}
            passwordConfirmation={editForm.password_confirmation}
            saving={saving}
            saveLabel="Save changes"
            onCancel={() => setEditOpen(false)}
            onNameChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
            onEmailChange={(v) => setEditForm((f) => ({ ...f, email: v }))}
            onPhoneChange={(v) => setEditForm((f) => ({ ...f, phone: v }))}
            onPasswordChange={(v) => setEditForm((f) => ({ ...f, password: v }))}
            onPasswordConfirmationChange={(v) => setEditForm((f) => ({ ...f, password_confirmation: v }))}
            onSubmit={(e) => void handleEdit(e)}
          />
        </Modal>
      ) : null}

      {detailOpen ? (
        <Modal
          title={detail?.name ?? "Guest details"}
          subtitle={detail?.email ?? undefined}
          onClose={() => setDetailOpen(false)}
          wide
        >
          {detailLoading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
          {detail ? (
            <GuestDetailView
              detail={detail}
              historyRows={historyRows}
              historyLoading={historyLoading}
              readOnly
            />
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}

function GuestForm({
  mode,
  name,
  email,
  phone,
  password,
  passwordConfirmation,
  saving,
  saveLabel,
  onCancel,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onPasswordChange,
  onPasswordConfirmationChange,
  onSubmit,
}: {
  mode: "create" | "edit";
  name: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirmation: string;
  saving: boolean;
  saveLabel: string;
  onCancel: () => void;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onPasswordConfirmationChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-xs font-medium text-zinc-600">
        Full name
        <input
          className="dash-input mt-1 w-full"
          required
          placeholder="e.g. Maria Santos"
          value={name}
          onChange={(e) => onNameChange(sanitizePersonName(e.target.value))}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600">
        Email
        <input
          type="email"
          className="dash-input mt-1 w-full"
          required
          maxLength={INPUT_MAX.email}
          placeholder="guest@example.com"
          value={email}
          onChange={(e) => onEmailChange(sanitizeEmailTyping(e.target.value))}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600">
        Phone
        <input
          className="dash-input mt-1 w-full"
          placeholder="09xx xxx xxxx"
          value={phone}
          onChange={(e) => onPhoneChange(sanitizePhoneInput(e.target.value))}
        />
      </label>
      <p className="text-xs font-medium text-zinc-600">
        {mode === "create" ? "Password" : "New password (optional)"}
      </p>
      <label className="block text-xs font-medium text-zinc-600">
        Password
        <input
          type="password"
          className="dash-input mt-1 w-full"
          required={mode === "create"}
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600">
        Confirm password
        <input
          type="password"
          className="dash-input mt-1 w-full"
          required={mode === "create" || password.length > 0}
          minLength={8}
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={passwordConfirmation}
          onChange={(e) => onPasswordConfirmationChange(e.target.value)}
        />
      </label>
      {mode === "create" ? (
        <p className="text-xs text-zinc-500">At least 8 characters with upper and lower case and a number.</p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <button type="button" className="dash-btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="dash-btn-primary inline-flex items-center gap-2" disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saveLabel}
        </button>
      </div>
    </form>
  );
}

function GuestDetailView({
  detail,
  historyRows,
  historyLoading,
  readOnly = false,
}: {
  detail: GuestDetail;
  historyRows: ReservationRow[];
  historyLoading: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-zinc-500">Phone</dt>
          <dd className="font-medium text-navy">{detail.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Bookings</dt>
          <dd className="font-medium text-navy">{detail.reservationCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Total spent</dt>
          <dd className="font-medium text-emerald-700">{formatPhp(Number(detail.totalSpent))}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Last stay</dt>
          <dd className="font-medium text-navy">{formatStay(detail.lastCheckIn, detail.lastCheckOut)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">First visit</dt>
          <dd className="font-medium text-navy">{detail.firstBooking?.slice(0, 10) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Login account</dt>
          <dd className="font-medium text-navy">
            {detail.hasLoginAccount ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <UserCheck size={14} /> Active
              </span>
            ) : (
              <span className="text-zinc-500">Guest booked without a platform login</span>
            )}
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">Booking history</h3>
        {historyLoading ? <p className="text-sm text-zinc-500">Loading reservations…</p> : null}
        {!historyLoading && historyRows.length === 0 ? (
          <p className="text-sm text-zinc-500">No reservations yet.</p>
        ) : null}
        {!historyLoading && historyRows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-zinc-100">
            <table className="dash-table text-sm">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Room</th>
                  <th>Stay</th>
                  <th>Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.referenceNo}</td>
                    <td>{r.room?.name ?? "—"}</td>
                    <td className="text-xs text-zinc-600">
                      {r.checkInDate?.slice(0, 10)} → {r.checkOutDate?.slice(0, 10)}
                    </td>
                    <td>{formatPhp(Number(r.reservationFee))}</td>
                    <td className="text-xs uppercase text-zinc-600">{r.status.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

    </div>
  );
}

function GuestList({
  loading,
  filtered,
  search,
  deletingKey,
  bulk,
  onDetail,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  loading: boolean;
  filtered: Guest[];
  search: string;
  deletingKey: string | null;
  bulk: ReturnType<typeof useBulkSelection<Guest>>;
  onDetail: (g: Guest) => void;
  onEdit?: (g: Guest) => void;
  onDelete?: (g: Guest) => void;
  readOnly?: boolean;
}) {
  if (loading) {
    return (
      <DashCard className="overflow-hidden p-0">
        <div className="md:hidden p-4">
          <DashMobileTableSkeleton rows={5} />
        </div>
        <div className="hidden md:block space-y-2 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-softGray" />
          ))}
        </div>
      </DashCard>
    );
  }

  if (filtered.length === 0) {
    return (
      <DashCard className="overflow-hidden p-0">
        <div className="px-6 py-16 text-center">
          <Users size={32} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500">No guests found.</p>
          {search ? <p className="text-xs text-zinc-400 mt-1">Try clearing the search filter.</p> : null}
        </div>
      </DashCard>
    );
  }

  return (
    <DashCard className="overflow-hidden p-0">
      <div className="md:hidden space-y-3 p-4">
        {filtered.map((g) => (
          <DashMobileTableCard
            key={g.guestKey}
            title={
              <span className="flex items-center gap-2">
                {!readOnly ? (
                  <BulkSelectMobile
                    checked={bulk.isSelected(g.guestKey)}
                    onChange={() => bulk.toggle(g.guestKey)}
                    ariaLabel={`Select ${g.name}`}
                  />
                ) : null}
                {g.name}
                {g.hasLoginAccount ? <UserCheck size={14} className="text-emerald-600" aria-label="Has login" /> : null}
              </span>
            }
            fields={[
              {
                label: "Email",
                value: g.email ? (
                  <a href={`mailto:${g.email}`} className="inline-flex items-center gap-1 text-slateBlue hover:underline text-xs break-all">
                    <Mail size={11} /> {g.email}
                  </a>
                ) : (
                  "—"
                ),
              },
              { label: "Phone", value: g.phone ?? "—" },
              {
                label: "Bookings",
                value: (
                  <span className="inline-flex items-center gap-1 rounded-full bg-navy/8 px-2 py-0.5 text-xs font-bold text-navy">
                    {g.reservationCount}
                  </span>
                ),
              },
              { label: "Total spent", value: formatPhp(Number(g.totalSpent)) },
              { label: "Last stay", value: formatStay(g.lastCheckIn, g.lastCheckOut) },
            ]}
            actions={
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" className="w-full justify-center gap-2 text-xs" onClick={() => onDetail(g)}>
                  <Eye size={14} /> Details
                </Button>
                {!readOnly && onEdit && onDelete ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="justify-center gap-1 text-xs" onClick={() => onEdit(g)}>
                    <Pencil size={14} /> Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-center gap-1 text-xs text-rose-700"
                    disabled={deletingKey === g.guestKey}
                    onClick={() => onDelete(g)}
                  >
                    <Trash2 size={14} /> Remove
                  </Button>
                </div>
                ) : null}
              </div>
            }
          />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="dash-table">
          <thead>
            <tr>
              {!readOnly ? (
              <BulkSelectTh
                checked={bulk.isAllSelected}
                indeterminate={bulk.isSomeSelected}
                onChange={() => (bulk.isAllSelected ? bulk.clear() : bulk.selectAll())}
                disabled={filtered.length === 0}
              />
              ) : null}
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Bookings</th>
              <th>Total spent</th>
              <th>Last stay</th>
              <th>Account</th>
              <DashTableActionsHead />
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.guestKey}>
                {!readOnly ? (
                <BulkSelectTd
                  checked={bulk.isSelected(g.guestKey)}
                  onChange={() => bulk.toggle(g.guestKey)}
                  ariaLabel={`Select ${g.name}`}
                />
                ) : null}
                <td className="font-semibold text-navy">
                  <span className="inline-flex items-center gap-1.5">
                    {g.name}
                    {g.hasLoginAccount ? <UserCheck size={14} className="text-emerald-600" aria-label="Has login" /> : null}
                  </span>
                </td>
                <td>
                  {g.email ? (
                    <a href={`mailto:${g.email}`} className="inline-flex items-center gap-1 text-slateBlue hover:underline text-xs">
                      <Mail size={11} /> {g.email}
                    </a>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="text-zinc-600">{g.phone ?? "—"}</td>
                <td>
                  <span className="inline-flex items-center gap-1 rounded-full bg-navy/8 px-2 py-0.5 text-xs font-bold text-navy">
                    {g.reservationCount}
                  </span>
                </td>
                <td className="font-semibold text-emerald-700">{formatPhp(Number(g.totalSpent))}</td>
                <td className="text-zinc-600 text-xs">{formatStay(g.lastCheckIn, g.lastCheckOut)}</td>
                <td className="text-xs">
                  {g.hasLoginAccount ? <span className="text-emerald-700">Yes</span> : <span className="text-zinc-400">—</span>}
                </td>
                <DashTableActionsCell>
                  <DashTableActionsInner>
                    <button type="button" className="dash-btn-sm" onClick={() => onDetail(g)} title="View details">
                      <Eye size={14} />
                    </button>
                    {!readOnly && onEdit ? (
                    <button type="button" className="dash-btn-sm" onClick={() => onEdit(g)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    ) : null}
                    {!readOnly && onDelete ? (
                    <button
                      type="button"
                      className="dash-btn-sm text-rose-700"
                      disabled={deletingKey === g.guestKey}
                      onClick={() => onDelete(g)}
                      title="Remove"
                    >
                      {deletingKey === g.guestKey ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                    ) : null}
                  </DashTableActionsInner>
                </DashTableActionsCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashCard>
  );
}
