"use client";

import DashCard from "@/components/dash/DashCard";
import { apiClient } from "@/lib/api/client";
import { listResorts } from "@/lib/api/resort";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import {
  DashTableActionsCell,
  DashTableActionsHead,
  DashTableActionsInner,
} from "@/components/shared/DashTableActions";
import DashMobileTableCard from "@/components/shared/DashMobileTableCard";
import { useToast } from "@/components/shared/ToastProvider";
import { Loader2, Percent, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

type DiscountCode = {
  id: number;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
};

type ApiEnvelope<T> = { success: boolean; data: T };

const blankForm = {
  code: "",
  type: "percentage" as "percentage" | "fixed",
  value: "",
  max_uses: "",
  valid_from: "",
  valid_until: "",
};

export default function ResortDiscountsPage() {
  const [resortId, setResortId] = useState<number | null>(null);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const resorts = await listResorts({ perPage: 5 });
      const id = resorts.data[0]?.id ?? null;
      setResortId(id);
      if (!id) { setCodes([]); return; }

      const { data } = await apiClient.get<ApiEnvelope<DiscountCode[]>>(`/resorts/${id}/discount-codes`);
      setCodes(Array.isArray(data.data) ? data.data : []);
      setError(null);
    } catch (err) {
      setCodes([]);
      setError(parseApiErrorMessage(err, "Failed to load discount codes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resortId) return;
    setCreating(true);
    try {
      const { data } = await apiClient.post<ApiEnvelope<DiscountCode>>(`/resorts/${resortId}/discount-codes`, {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      });
      setCodes((prev) => [data.data, ...prev]);
      setForm(blankForm);
      setShowForm(false);
      pushToast({ title: "Discount code created", tone: "success" });
    } catch (err) {
      pushToast({ title: "Failed to create code", description: parseApiErrorMessage(err), tone: "error" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!resortId || !confirm("Delete this discount code?")) return;
    setDeleting(id);
    try {
      await apiClient.delete(`/resorts/${resortId}/discount-codes/${id}`);
      setCodes((prev) => prev.filter((c) => c.id !== id));
      pushToast({ title: "Code deleted", tone: "success" });
    } catch (err) {
      pushToast({ title: "Delete failed", description: parseApiErrorMessage(err), tone: "error" });
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (code: DiscountCode) => {
    if (!resortId) return;
    try {
      await apiClient.patch(`/resorts/${resortId}/discount-codes/${code.id}`, { is_active: !code.is_active });
      setCodes((prev) => prev.map((c) => c.id === code.id ? { ...c, is_active: !c.is_active } : c));
      pushToast({
        title: !code.is_active ? "Code activated" : "Code paused",
        description: !code.is_active ? "Guests can use this discount again." : "This code won’t apply until re-enabled.",
        tone: "success",
      });
    } catch (err) {
      pushToast({ title: "Update failed", description: parseApiErrorMessage(err), tone: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="dash-page-header">
          <h1 className="dash-page-title flex items-center gap-2">
            <Percent size={22} className="text-accentOrange" /> Discount Codes
          </h1>
          <p className="dash-page-sub">Create and manage coupon codes for your resort.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="dash-btn-primary" disabled={!resortId}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New code</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && resortId && (
        <DashCard className="space-y-4 p-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <h2 className="font-dash text-base font-semibold text-navy">Create discount code</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="dash-label">Code</label>
              <input className="dash-input font-mono uppercase" placeholder="SUMMER20" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })} required maxLength={32} />
            </div>
            <div>
              <label className="dash-label">Type</label>
              <select className="dash-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "percentage" | "fixed" })}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (₱)</option>
              </select>
            </div>
            <div>
              <label className="dash-label">Value</label>
              <input type="number" className="dash-input" placeholder={form.type === "percentage" ? "e.g. 15" : "e.g. 500"}
                value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required min={1} />
            </div>
            <div>
              <label className="dash-label">Max uses (blank = unlimited)</label>
              <input type="number" className="dash-input" placeholder="Leave blank for unlimited"
                value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} min={1} />
            </div>
            <div>
              <label className="dash-label">Valid from</label>
              <input type="date" className="dash-input" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            </div>
            <div>
              <label className="dash-label">Valid until</label>
              <input type="date" className="dash-input" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
            </div>
          </div>

          <button type="submit" disabled={creating} className="dash-btn-primary disabled:opacity-60">
            {creating
              ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Saving…</span>
              : "Create code"}
          </button>
        </form>
        </DashCard>
      )}

      {/* List */}
      <DashCard className="overflow-hidden p-0">
        {error ? <p className="px-6 py-4 text-sm text-rose-700">{error}</p> : null}
        {loading ? (
          <div className="space-y-2 p-4">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-xl bg-softGray"/>)}</div>
        ) : codes.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Percent size={32} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500">No discount codes yet. Create your first one above.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {codes.map((c) => (
                <DashMobileTableCard
                  key={c.id}
                  title={<span className="font-mono text-sm font-bold tracking-wider">{c.code}</span>}
                  fields={[
                    { label: "Type", value: <span className="dash-badge-slate capitalize">{c.type}</span> },
                    {
                      label: "Value",
                      value: (
                        <span className="font-semibold text-accentOrange">
                          {c.type === "percentage" ? `${c.value}%` : `₱${c.value.toLocaleString()}`}
                        </span>
                      ),
                    },
                    {
                      label: "Uses",
                      value: `${c.uses_count}${c.max_uses ? ` / ${c.max_uses}` : " / ∞"}`,
                    },
                    { label: "Valid until", value: c.valid_until ?? "—" },
                    {
                      label: "Active",
                      value: (
                        <button
                          type="button"
                          onClick={() => void toggleActive(c)}
                          className={`min-h-11 w-full max-w-xs rounded-xl px-3 text-xs font-semibold transition ${
                            c.is_active
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          {c.is_active ? "Active — tap to deactivate" : "Inactive — tap to activate"}
                        </button>
                      ),
                    },
                  ]}
                  actions={
                    <button
                      type="button"
                      disabled={deleting === c.id}
                      onClick={() => void handleDelete(c.id)}
                      className="dash-btn-danger w-full justify-center"
                    >
                      {deleting === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Delete code
                    </button>
                  }
                />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Uses</th>
                    <th>Valid until</th>
                    <th>Status</th>
                    <DashTableActionsHead />
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono font-bold text-navy tracking-wider">{c.code}</td>
                      <td>
                        <span className="dash-badge-slate capitalize">{c.type}</span>
                      </td>
                      <td className="font-semibold text-accentOrange">
                        {c.type === "percentage" ? `${c.value}%` : `₱${c.value.toLocaleString()}`}
                      </td>
                      <td className="text-zinc-600">
                        {c.uses_count}
                        {c.max_uses ? ` / ${c.max_uses}` : " / ∞"}
                      </td>
                      <td className="text-xs text-zinc-500">{c.valid_until ?? "—"}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => void toggleActive(c)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            c.is_active
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                          }`}
                        >
                          {c.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <DashTableActionsCell>
                        <DashTableActionsInner>
                          <button
                            type="button"
                            disabled={deleting === c.id}
                            onClick={() => void handleDelete(c.id)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deleting === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            Delete
                          </button>
                        </DashTableActionsInner>
                      </DashTableActionsCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DashCard>
    </div>
  );
}

