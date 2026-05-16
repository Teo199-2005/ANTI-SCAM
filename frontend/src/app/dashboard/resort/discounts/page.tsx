"use client";

import DashCard from "@/components/dash/DashCard";
import DashModal from "@/components/dash/DashModal";
import DashboardFilterSearch from "@/components/dashboard/DashboardFilterSearch";
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
import { apiClient } from "@/lib/api/client";
import { bulkDeleteDiscountCodes, bulkDeleteToastDescription } from "@/lib/api/bulkDelete";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { listResorts } from "@/lib/api/resort";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { formatPhp } from "@/lib/formatPhp";
import {
  sanitizeIntegerDigitsOnly,
  sanitizeReferralCodeInput,
  sanitizeSearchQuery,
  sanitizeUnsignedDecimal,
} from "@/lib/inputRestrictions";
import { Loader2, Pencil, Percent, Plus, Tag, Trash2, Ticket } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type DiscountType = "percent" | "fixed";

type DiscountCode = {
  id: number;
  code: string;
  type: DiscountType;
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
};

type DiscountForm = {
  code: string;
  type: DiscountType;
  value: string;
  max_uses: string;
  valid_from: string;
  valid_until: string;
};

type ApiEnvelope<T> = { success: boolean; data: T };

type CodeStatus = "active" | "inactive" | "expired" | "scheduled" | "depleted";

const blankForm: DiscountForm = {
  code: "",
  type: "percent",
  value: "",
  max_uses: "",
  valid_from: "",
  valid_until: "",
};

function normalizeDiscountCode(raw: Record<string, unknown>): DiscountCode {
  const typeRaw = String(raw.type ?? "fixed");
  const type: DiscountType =
    typeRaw === "percent" || typeRaw === "percentage" ? "percent" : "fixed";

  return {
    id: Number(raw.id),
    code: String(raw.code ?? ""),
    type,
    value: Number(raw.value ?? 0),
    max_uses: raw.max_uses != null ? Number(raw.max_uses) : null,
    used_count: Number(raw.used_count ?? raw.uses_count ?? 0),
    valid_from: raw.valid_from != null ? String(raw.valid_from) : null,
    valid_until: raw.valid_until != null ? String(raw.valid_until) : null,
    is_active: Boolean(raw.is_active ?? true),
  };
}

function extractCodes(payload: unknown): DiscountCode[] {
  if (Array.isArray(payload)) {
    return payload.map((row) => normalizeDiscountCode(row as Record<string, unknown>));
  }
  return [];
}

function toFormDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatDisplayDate(iso: string | null): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
  return new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function codeStatus(c: DiscountCode): CodeStatus {
  if (!c.is_active) return "inactive";
  if (c.max_uses != null && c.used_count >= c.max_uses) return "depleted";
  const today = new Date().toISOString().slice(0, 10);
  if (c.valid_until && c.valid_until.slice(0, 10) < today) return "expired";
  if (c.valid_from && c.valid_from.slice(0, 10) > today) return "scheduled";
  return "active";
}

const statusBadge: Record<CodeStatus, string> = {
  active: "dash-badge-emerald",
  inactive: "dash-badge-slate",
  expired: "dash-badge-orange",
  scheduled: "dash-badge-slate",
  depleted: "dash-badge-orange",
};

const statusLabel: Record<CodeStatus, string> = {
  active: "Active",
  inactive: "Paused",
  expired: "Expired",
  scheduled: "Scheduled",
  depleted: "Limit reached",
};

function formatValue(c: DiscountCode): string {
  return c.type === "percent" ? `${c.value}%` : formatPhp(Number(c.value));
}

function DiscountCodeForm({
  mode,
  form,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  form: DiscountForm;
  saving: boolean;
  onChange: (patch: Partial<DiscountForm>) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="dash-label" htmlFor="discount-code">
            Code
          </label>
          <input
            id="discount-code"
            className="dash-input font-mono uppercase tracking-wider"
            placeholder="SUMMER20"
            value={form.code}
            onChange={(e) => onChange({ code: sanitizeReferralCodeInput(e.target.value) })}
            required
            maxLength={32}
            autoComplete="off"
          />
          <p className="mt-1 text-[11px] text-zinc-500">Guests enter this at checkout. Letters and numbers only.</p>
        </div>

        <div>
          <label className="dash-label" htmlFor="discount-type">
            Type
          </label>
          <select
            id="discount-type"
            className="dash-input"
            value={form.type}
            onChange={(e) => onChange({ type: e.target.value as DiscountType, value: "" })}
          >
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Fixed amount (₱)</option>
          </select>
        </div>

        <div>
          <label className="dash-label" htmlFor="discount-value">
            Value
          </label>
          <input
            id="discount-value"
            type="text"
            inputMode="decimal"
            className="dash-input"
            placeholder={form.type === "percent" ? "e.g. 15" : "e.g. 500"}
            value={form.value}
            onChange={(e) =>
              onChange({
                value:
                  form.type === "percent"
                    ? sanitizeIntegerDigitsOnly(e.target.value, 3)
                    : sanitizeUnsignedDecimal(e.target.value),
              })
            }
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="dash-label" htmlFor="discount-max-uses">
            Max uses
          </label>
          <input
            id="discount-max-uses"
            type="text"
            inputMode="numeric"
            className="dash-input"
            placeholder="Unlimited"
            value={form.max_uses}
            onChange={(e) => onChange({ max_uses: sanitizeIntegerDigitsOnly(e.target.value, 7) })}
            pattern="[0-9]*"
          />
          <p className="mt-1 text-[11px] text-zinc-500">Leave blank for unlimited redemptions.</p>
        </div>

        <div>
          <label className="dash-label" htmlFor="discount-valid-from">
            Valid from
          </label>
          <input
            id="discount-valid-from"
            type="date"
            className="dash-input"
            value={form.valid_from}
            onChange={(e) => onChange({ valid_from: e.target.value })}
          />
          <p className="mt-1 text-[11px] text-zinc-500">Blank = starts immediately.</p>
        </div>

        <div>
          <label className="dash-label" htmlFor="discount-valid-until">
            Valid until
          </label>
          <input
            id="discount-valid-until"
            type="date"
            className="dash-input"
            value={form.valid_until}
            onChange={(e) => onChange({ valid_until: e.target.value })}
          />
          <p className="mt-1 text-[11px] text-zinc-500">Blank = no expiry.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
        <button type="submit" disabled={saving} className="dash-btn-primary disabled:opacity-60">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Saving…
            </span>
          ) : mode === "create" ? (
            "Create code"
          ) : (
            "Save changes"
          )}
        </button>
        <button type="button" className="dash-btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function ResortDiscountsPage() {
  const { pushToast } = useToast();
  const [resortId, setResortId] = useState<number | null>(null);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(blankForm);
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editCode, setEditCode] = useState<DiscountCode | null>(null);
  const [editForm, setEditForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DiscountCode | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resorts = await listResorts({ perPage: 10 });
      const id = resorts.data[0]?.id ?? null;
      setResortId(id);
      if (!id) {
        setCodes([]);
        return;
      }

      const { data } = await apiClient.get<ApiEnvelope<unknown>>(`/resorts/${id}/discount-codes`);
      setCodes(extractCodes(data.data));
    } catch (err) {
      setCodes([]);
      setError(parseApiErrorMessage(err, "Failed to load discount codes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return codes;
    const s = search.trim().toLowerCase();
    return codes.filter((c) => c.code.toLowerCase().includes(s));
  }, [codes, search]);

  const bulk = useBulkSelection(filtered, (c) => c.id);

  const stats = useMemo(() => {
    const redeemable = codes.filter((c) => codeStatus(c) === "active").length;
    const totalUses = codes.reduce((sum, c) => sum + c.used_count, 0);
    return { total: codes.length, redeemable, totalUses };
  }, [codes]);

  const openCreate = () => {
    setCreateForm(blankForm);
    setCreateOpen(true);
  };

  const openEdit = (c: DiscountCode) => {
    setEditCode(c);
    setEditForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      valid_from: toFormDate(c.valid_from),
      valid_until: toFormDate(c.valid_until),
    });
    setEditOpen(true);
  };

  const buildPayload = (form: DiscountForm) => ({
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: Number(form.value),
    max_uses: form.max_uses ? Number(form.max_uses) : null,
    valid_from: form.valid_from || null,
    valid_until: form.valid_until || null,
  });

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!resortId) return;
    setCreating(true);
    try {
      const { data } = await apiClient.post<ApiEnvelope<Record<string, unknown>>>(
        `/resorts/${resortId}/discount-codes`,
        buildPayload(createForm),
      );
      const created = normalizeDiscountCode(data.data);
      setCodes((prev) => [created, ...prev]);
      setCreateOpen(false);
      setCreateForm(blankForm);
      pushToast({ title: "Discount code created", description: created.code, tone: "success" });
    } catch (err) {
      pushToast({ title: "Could not create code", description: parseApiErrorMessage(err), tone: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resortId || !editCode) return;
    setSaving(true);
    try {
      const { data } = await apiClient.patch<ApiEnvelope<Record<string, unknown>>>(
        `/resorts/${resortId}/discount-codes/${editCode.id}`,
        buildPayload(editForm),
      );
      const updated = normalizeDiscountCode(data.data);
      setCodes((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditOpen(false);
      setEditCode(null);
      pushToast({ title: "Code updated", description: updated.code, tone: "success" });
    } catch (err) {
      pushToast({ title: "Update failed", description: parseApiErrorMessage(err), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: DiscountCode) => {
    if (!resortId) return;
    setDeletingId(c.id);
    try {
      await apiClient.delete(`/resorts/${resortId}/discount-codes/${c.id}`);
      setCodes((prev) => prev.filter((row) => row.id !== c.id));
      bulk.clear();
      setConfirmDelete(null);
      pushToast({ title: "Code deleted", tone: "success" });
    } catch (err) {
      pushToast({ title: "Delete failed", description: parseApiErrorMessage(err), tone: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const onBulkDelete = async () => {
    if (!resortId) return;
    const ids = bulk.selectedIds.map((id) => Number(id)).filter((id) => id > 0);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteDiscountCodes(resortId, ids);
      await load();
      bulk.clear();
      pushToast({
        title: result.failed.length ? "Bulk delete completed with errors" : "Codes deleted",
        description: bulkDeleteToastDescription(result),
        tone: result.failed.length ? "warning" : "success",
      });
    } catch (err) {
      pushToast({
        title: "Bulk delete failed",
        description: parseApiErrorMessage(err, "Unable to delete selected codes."),
        tone: "error",
      });
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  const toggleActive = async (code: DiscountCode) => {
    if (!resortId) return;
    try {
      const { data } = await apiClient.patch<ApiEnvelope<Record<string, unknown>>>(
        `/resorts/${resortId}/discount-codes/${code.id}`,
        { is_active: !code.is_active },
      );
      const updated = normalizeDiscountCode(data.data);
      setCodes((prev) => prev.map((c) => (c.id === code.id ? updated : c)));
      pushToast({
        title: updated.is_active ? "Code activated" : "Code paused",
        description: updated.is_active
          ? "Guests can use this discount again."
          : "This code will not apply until you turn it back on.",
        tone: "success",
      });
    } catch (err) {
      pushToast({ title: "Update failed", description: parseApiErrorMessage(err), tone: "error" });
    }
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(query);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="dash-page-title flex items-center gap-2">
            <Percent size={24} className="text-accentOrange" />
            Discount Codes
          </h1>
          <p className="dash-page-sub">Create coupon codes for your resort. Guests apply them at checkout.</p>
        </div>
        <button
          type="button"
          className="dash-btn-primary inline-flex shrink-0 items-center gap-2"
          disabled={!resortId}
          onClick={openCreate}
        >
          <Plus size={16} aria-hidden />
          New code
        </button>
      </div>

      {!loading && codes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <DashCard className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy/8 text-navy">
              <Ticket size={20} />
            </span>
            <div>
              <p className="text-xs font-medium text-zinc-500">Total codes</p>
              <p className="font-dash text-xl font-semibold text-navy">{stats.total}</p>
            </div>
          </DashCard>
          <DashCard className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Tag size={20} />
            </span>
            <div>
              <p className="text-xs font-medium text-zinc-500">Redeemable now</p>
              <p className="font-dash text-xl font-semibold text-navy">{stats.redeemable}</p>
            </div>
          </DashCard>
          <DashCard className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accentOrange/10 text-accentOrange">
              <Percent size={20} />
            </span>
            <div>
              <p className="text-xs font-medium text-zinc-500">Total redemptions</p>
              <p className="font-dash text-xl font-semibold text-navy">{stats.totalUses}</p>
            </div>
          </DashCard>
        </div>
      ) : null}

      <div className="dash-filter-bar">
        <form onSubmit={onSearch} className="contents">
          <DashboardFilterSearch
            value={query}
            onChange={(v) => setQuery(sanitizeSearchQuery(v))}
            placeholder="Search by code…"
            wide
          />
        </form>
        {!loading ? (
          <span className="ml-auto shrink-0 rounded-full bg-navy/8 px-3 py-1 text-xs font-medium text-navy">
            {filtered.length} code{filtered.length !== 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      <BulkActionBar
        count={bulk.selectedCount}
        onClear={bulk.clear}
        onDelete={() => setConfirmBulkDelete(true)}
        deleting={bulkDeleting}
        deleteLabel="Delete selected codes"
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <DashCard className="overflow-hidden p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            <DashMobileTableSkeleton rows={4} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Percent size={36} className="mx-auto mb-3 text-zinc-300" />
            <p className="font-medium text-zinc-700">
              {search ? "No codes match your search" : "No discount codes yet"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {search
                ? "Try a different code or clear the search."
                : "Create a code guests can enter when booking online."}
            </p>
            {!search && resortId ? (
              <button
                type="button"
                className="dash-btn-primary mt-6 inline-flex items-center gap-2"
                onClick={openCreate}
              >
                <Plus size={14} aria-hidden />
                Create your first code
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {filtered.map((c) => {
                const status = codeStatus(c);
                return (
                  <DashMobileTableCard
                    key={c.id}
                    title={
                      <span className="inline-flex items-center gap-2 font-mono text-sm font-bold tracking-wider">
                        <BulkSelectMobile
                          checked={bulk.isSelected(c.id)}
                          onChange={() => bulk.toggle(c.id)}
                          ariaLabel={`Select ${c.code}`}
                        />
                        {c.code}
                      </span>
                    }
                    fields={[
                      {
                        label: "Discount",
                        value: (
                          <span className="font-semibold text-accentOrange">{formatValue(c)}</span>
                        ),
                      },
                      {
                        label: "Type",
                        value: (
                          <span className="dash-badge-slate capitalize">
                            {c.type === "percent" ? "Percentage" : "Fixed"}
                          </span>
                        ),
                      },
                      {
                        label: "Uses",
                        value: `${c.used_count}${c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}`,
                      },
                      { label: "Valid until", value: formatDisplayDate(c.valid_until) },
                      {
                        label: "Status",
                        value: <span className={statusBadge[status]}>{statusLabel[status]}</span>,
                      },
                    ]}
                    actions={
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleActive(c)}
                          className={`min-h-11 w-full rounded-xl px-3 text-xs font-semibold transition ${
                            c.is_active
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          {c.is_active ? "Active — tap to pause" : "Paused — tap to activate"}
                        </button>
                        <button
                          type="button"
                          className="dash-btn-secondary w-full justify-center"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={() => setConfirmDelete(c)}
                          className="dash-btn-danger w-full justify-center"
                        >
                          {deletingId === c.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          Delete
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="dash-table">
                <thead>
                  <tr>
                    <BulkSelectTh
                      checked={bulk.isAllSelected}
                      indeterminate={bulk.isSomeSelected}
                      onChange={() => (bulk.isAllSelected ? bulk.clear() : bulk.selectAll())}
                      disabled={loading || filtered.length === 0}
                    />
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Uses</th>
                    <th>Valid from</th>
                    <th>Valid until</th>
                    <th>Status</th>
                    <DashTableActionsHead />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const status = codeStatus(c);
                    return (
                      <tr key={c.id}>
                        <BulkSelectTd
                          checked={bulk.isSelected(c.id)}
                          onChange={() => bulk.toggle(c.id)}
                          ariaLabel={`Select ${c.code}`}
                        />
                        <td className="font-mono font-bold tracking-wider text-navy">{c.code}</td>
                        <td>
                          <span className="font-semibold text-accentOrange">{formatValue(c)}</span>
                          <span className="ml-2 text-[10px] uppercase text-zinc-400">
                            {c.type === "percent" ? "%" : "fixed"}
                          </span>
                        </td>
                        <td className="text-zinc-600">
                          {c.used_count}
                          {c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
                        </td>
                        <td className="text-xs text-zinc-500">{formatDisplayDate(c.valid_from)}</td>
                        <td className="text-xs text-zinc-500">{formatDisplayDate(c.valid_until)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => void toggleActive(c)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${statusBadge[status]}`}
                            title={c.is_active ? "Click to pause" : "Click to activate"}
                          >
                            {statusLabel[status]}
                          </button>
                        </td>
                        <DashTableActionsCell>
                          <DashTableActionsInner>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg px-3 text-xs font-semibold text-navy hover:bg-zinc-100"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === c.id}
                              onClick={() => setConfirmDelete(c)}
                              className="inline-flex items-center gap-1 rounded-lg px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              {deletingId === c.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                              Delete
                            </button>
                          </DashTableActionsInner>
                        </DashTableActionsCell>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashCard>

      <DashModal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="Create discount code"
        description="Guests enter this code during online checkout."
        className="max-w-lg"
      >
        <DiscountCodeForm
          mode="create"
          form={createForm}
          saving={creating}
          onChange={(patch) => setCreateForm((f) => ({ ...f, ...patch }))}
          onSubmit={(e) => void handleCreate(e)}
          onCancel={() => setCreateOpen(false)}
        />
      </DashModal>

      <DashModal
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="Edit discount code"
        description={editCode?.code}
        className="max-w-lg"
      >
        <DiscountCodeForm
          mode="edit"
          form={editForm}
          saving={saving}
          onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
          onSubmit={(e) => void handleEdit(e)}
          onCancel={() => setEditOpen(false)}
        />
      </DashModal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete discount code?"
        description={
          confirmDelete
            ? `Delete ${confirmDelete.code}? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete code"
        tone="danger"
        loading={deletingId !== null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void handleDelete(confirmDelete);
        }}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete selected codes?"
        description={`Delete ${bulk.selectedCount} discount code${bulk.selectedCount === 1 ? "" : "s"}. This cannot be undone.`}
        confirmLabel="Delete selected"
        tone="danger"
        loading={bulkDeleting}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => void onBulkDelete()}
      />
    </div>
  );
}
