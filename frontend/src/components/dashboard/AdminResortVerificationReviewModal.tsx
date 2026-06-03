"use client";

import DashModal from "@/components/dash/DashModal";
import { EntityIdHint } from "@/components/shared/EntityIdHint";
import {
  approveResortVerification,
  downloadVerificationDocumentsZip,
  getResortVerificationDetail,
  getResortVerificationStats,
  rejectResortVerification,
  requestMoreVerificationDocuments,
  updateResortVerificationReview,
  updateResortVerificationStatus,
  type VerificationAssignee,
  type VerificationDetail,
  type VerificationDocument,
} from "@/lib/api/adminResortVerification";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { HOSPITALITY_LABELS, VERIFICATION_METHOD_LABELS } from "@/lib/onboarding/labels";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { cn } from "@/lib/utils";
import { Check, Download, ExternalLink, FileText, Loader2, Save, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

const DOC_LABELS: Record<string, string> = {
  government_id: "Government ID",
  property_tour: "Property tour",
  ownership_proof: "Ownership / authorization",
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-softBorder/80 py-2 last:border-0 sm:grid-cols-[8.5rem_1fr] sm:gap-3">
      <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-800">{children}</span>
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-dash text-xs font-bold uppercase tracking-wide text-zinc-500">{title}</h3>
      <div className="rounded-xl border border-softBorder bg-softCard/60 px-4">{children}</div>
    </section>
  );
}

function isImageUrl(url: string, name?: string | null): boolean {
  return !/\.pdf(\?|$)/i.test(`${name ?? ""} ${url}`);
}

function docByType(documents: VerificationDocument[], type: string): VerificationDocument | undefined {
  return documents.find((d) => d.document_type === type);
}

type Props = {
  resortId: number | null;
  open: boolean;
  onClose: () => void;
  onResolved: () => void;
};

export default function AdminResortVerificationReviewModal({
  resortId,
  open,
  onClose,
  onResolved,
}: Props) {
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listPublicly, setListPublicly] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | "needs_docs" | "save_review" | "zip" | null>(null);
  const [reviewers, setReviewers] = useState<VerificationAssignee[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledNotes, setScheduledNotes] = useState("");
  const [statusChangeReason, setStatusChangeReason] = useState("");

  const VERIFICATION_STATUSES = [
    { value: "not_verified", label: "Not Yet Verified" },
    { value: "pending", label: "Pending" },
    { value: "verified", label: "Verified" },
    { value: "rejected", label: "Rejected" },
    { value: "needs_documents", label: "Needs Documents" },
  ];

  useEffect(() => {
    if (!open || resortId == null) {
      setDetail(null);
      setError(null);
      setRejectReason("");
      setListPublicly(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void Promise.all([getResortVerificationDetail(resortId), getResortVerificationStats()])
      .then(([data, stats]) => {
        if (!cancelled) {
          setDetail(data);
          setReviewers(stats.reviewers);
          setAssigneeId(
            data.resort.verification_assigned_to_user_id != null
              ? String(data.resort.verification_assigned_to_user_id)
              : "",
          );
          setAdminNotes(data.resort.verification_admin_notes ?? "");
          setScheduledAt(
            data.resort.verification_scheduled_at
              ? data.resort.verification_scheduled_at.slice(0, 16)
              : "",
          );
          setScheduledNotes(data.resort.verification_scheduled_notes ?? "");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(parseApiErrorMessage(err, "Could not load verification details."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, resortId]);

  const handleApprove = async () => {
    if (resortId == null) return;
    setAction("approve");
    setError(null);
    try {
      await approveResortVerification(resortId, { list_publicly: listPublicly });
      onResolved();
      onClose();
    } catch (err) {
      setError(parseApiErrorMessage(err, "Could not approve verification."));
    } finally {
      setAction(null);
    }
  };

  const handleReject = async () => {
    if (resortId == null || rejectReason.trim().length < 3) {
      setError("Enter a rejection reason (at least 3 characters).");
      return;
    }
    setAction("reject");
    setError(null);
    try {
      await rejectResortVerification(resortId, { reason: rejectReason.trim() });
      onResolved();
      onClose();
    } catch (err) {
      setError(parseApiErrorMessage(err, "Could not reject verification."));
    } finally {
      setAction(null);
    }
  };

  const handleRequestDocuments = async () => {
    if (resortId == null || rejectReason.trim().length < 3) {
      setError("Enter a note for the owner (at least 3 characters).");
      return;
    }
    setAction("needs_docs");
    setError(null);
    try {
      await requestMoreVerificationDocuments(resortId, { reason: rejectReason.trim() });
      onResolved();
      onClose();
    } catch (err) {
      setError(parseApiErrorMessage(err, "Could not request more documents."));
    } finally {
      setAction(null);
    }
  };

  const handleSaveReview = async () => {
    if (resortId == null) return;
    setAction("save_review");
    setError(null);
    try {
      const updated = await updateResortVerificationReview(resortId, {
        verification_assigned_to_user_id: assigneeId ? Number(assigneeId) : null,
        verification_admin_notes: adminNotes.trim() || null,
        verification_scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        verification_scheduled_notes: scheduledNotes.trim() || null,
      });
      setDetail(updated);
    } catch (err) {
      setError(parseApiErrorMessage(err, "Could not save review details."));
    } finally {
      setAction(null);
    }
  };

  const handleDownloadZip = async () => {
    if (resortId == null) return;
    setAction("zip");
    setError(null);
    try {
      await downloadVerificationDocumentsZip(resortId);
    } catch (err) {
      setError(parseApiErrorMessage(err, "Could not download documents."));
    } finally {
      setAction(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (resortId == null || newStatus === resort?.verification_status) return;
    setAction("save_review");
    setError(null);
    try {
      await updateResortVerificationStatus(resortId, {
        verification_status: newStatus,
        reason: statusChangeReason.trim() || undefined,
      });
      onResolved();
      onClose();
    } catch (err) {
      setError(parseApiErrorMessage(err, "Could not update verification status."));
    } finally {
      setAction(null);
    }
  };

  const resort = detail?.resort;
  const publicHref = resort?.subdomain ? `/resort/${encodeURIComponent(resort.subdomain)}` : null;
  const canDecide =
    resort?.verification_status === "pending" && Boolean(resort.verification_submitted_at);

  return (
    <DashModal
      open={open}
      onClose={onClose}
      title={resort?.name ?? "Review verification"}
      description="Review submitted documents and approve or reject this resort."
      className="max-w-3xl"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-600">
          <Loader2 size={18} className="animate-spin text-primaryBlue" aria-hidden />
          Loading verification…
        </div>
      ) : error && !detail ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
      ) : detail ? (
        <div className="space-y-4">
          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
          ) : null}

          {detail.missing_document_types.length > 0 ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Missing uploads: {detail.missing_document_types.map((t) => DOC_LABELS[t] ?? t).join(", ")}
            </p>
          ) : null}

          <div className="flex flex-wrap items-start gap-4">
            {resort?.logo_url ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-softBorder bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={laravelPublicUrl(resort.logo_url)}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              {resort ? <EntityIdHint id={resort.id} secondaryId={resort.tenant_id} /> : null}
              {publicHref ? (
                <Link
                  href={publicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primaryBlue hover:underline"
                >
                  Preview landing page
                  <ExternalLink size={13} aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>

          <InfoPanel title="Owner">
            <DetailRow label="Name">{detail.owner?.name ?? "—"}</DetailRow>
            <DetailRow label="Email">{detail.owner?.email ?? "—"}</DetailRow>
            <DetailRow label="Phone">
              {detail.owner?.phone ?? detail.owner?.contact_number ?? "—"}
            </DetailRow>
          </InfoPanel>

          <InfoPanel title="Property">
            <DetailRow label="Resort name">{resort?.name ?? "—"}</DetailRow>
            <DetailRow label="Subdomain">{resort?.subdomain ?? "—"}</DetailRow>
            <DetailRow label="Hospitality">
              {resort?.hospitality_type
                ? (HOSPITALITY_LABELS[resort.hospitality_type] ?? resort.hospitality_type)
                : "—"}
            </DetailRow>
            <DetailRow label="Contact">{resort?.contact_number ?? "—"}</DetailRow>
            <DetailRow label="Representative">
              {resort?.representative_name
                ? `${resort.representative_name}${resort.representative_contact_number ? ` · ${resort.representative_contact_number}` : ""}`
                : "—"}
            </DetailRow>
            <DetailRow label="Address">{resort?.address_display?.trim() || "—"}</DetailRow>
            <DetailRow label="Description">
              {resort?.description?.trim() ? (
                <span className="whitespace-pre-wrap">{resort.description}</span>
              ) : (
                "—"
              )}
            </DetailRow>
            <DetailRow label="Rooms / photos">
              {resort?.rooms_count ?? 0} room(s) · {resort?.room_photo_count ?? 0} photo(s) ·{" "}
              {resort?.amenities_count ?? 0} amenities
            </DetailRow>
            <DetailRow label="Subscription">
              {resort?.subscription_plan
                ? `${resort.subscription_plan}${resort.subscription_status ? ` · ${resort.subscription_status}` : ""}`
                : "—"}
            </DetailRow>
            <DetailRow label="Public listing">
              {resort?.is_publicly_listed ? "Listed" : "Not listed"}
              {resort?.is_vip ? " · VIP" : ""}
            </DetailRow>
          </InfoPanel>

          {detail.business ? (
            <InfoPanel title="Business registration">
              <DetailRow label="Status">{detail.business.business_status ?? "—"}</DetailRow>
              <DetailRow label="Business name">{detail.business.business_name ?? "—"}</DetailRow>
              <DetailRow label="Address">{detail.business.business_address ?? "—"}</DetailRow>
              <DetailRow label="Contact">{detail.business.business_contact_number ?? "—"}</DetailRow>
              <DetailRow label="TIN">{detail.business.business_tin ?? "—"}</DetailRow>
              <DetailRow label="SEC / DTI">{detail.business.sec_dti_number ?? "—"}</DetailRow>
            </InfoPanel>
          ) : null}

          <InfoPanel title="Verification">
            <DetailRow label="Status">
              <span className="capitalize">{resort?.verification_status ?? "—"}</span>
            </DetailRow>
            <DetailRow label="Method">
              {resort?.verification_method
                ? (VERIFICATION_METHOD_LABELS[resort.verification_method] ?? resort.verification_method)
                : "—"}
            </DetailRow>
            <DetailRow label="Submitted">
              {resort?.verification_submitted_at
                ? new Date(resort.verification_submitted_at).toLocaleString("en-PH")
                : "—"}
            </DetailRow>
            <DetailRow label="Submission #">
              {resort?.verification_submission_count
                ? `#${resort.verification_submission_count}`
                : "—"}
            </DetailRow>
            {resort?.verification_rejection_reason ? (
              <DetailRow label="Last owner note">
                <span className="whitespace-pre-wrap">{resort.verification_rejection_reason}</span>
              </DetailRow>
            ) : null}
          </InfoPanel>

          <InfoPanel title="Review operations">
            <div className="space-y-3 py-2">
              <label className="block text-xs font-semibold text-zinc-600">Assigned reviewer</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-softBorder px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {reviewers.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.name} ({r.email})
                  </option>
                ))}
              </select>
              <label className="block text-xs font-semibold text-zinc-600">Scheduled call / visit</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-softBorder px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={scheduledNotes}
                onChange={(e) => setScheduledNotes(e.target.value)}
                placeholder="Meeting link, address, or staff notes"
                className="w-full rounded-xl border border-softBorder px-3 py-2 text-sm"
              />
              <label className="block text-xs font-semibold text-zinc-600">Internal admin notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-softBorder px-3 py-2 text-sm"
                placeholder="Not visible to the owner"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={action !== null}
                  onClick={() => void handleSaveReview()}
                  className="dash-btn-sm inline-flex items-center gap-1"
                >
                  {action === "save_review" ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden />
                  ) : (
                    <Save size={14} aria-hidden />
                  )}
                  Save review
                </button>
                <button
                  type="button"
                  disabled={action !== null}
                  onClick={() => void handleDownloadZip()}
                  className="dash-btn-sm inline-flex items-center gap-1"
                >
                  {action === "zip" ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden />
                  ) : (
                    <Download size={14} aria-hidden />
                  )}
                  Download ZIP
                </button>
              </div>
            </div>
          </InfoPanel>

          <InfoPanel title="Change verification status">
            <div className="space-y-3 py-2">
              <p className="text-xs text-zinc-500">
                Directly change the verification status. This bypasses the normal review workflow.
              </p>
              <div className="flex flex-wrap gap-2">
                {VERIFICATION_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    disabled={action !== null || s.value === resort?.verification_status}
                    onClick={() => void handleStatusChange(s.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                      s.value === resort?.verification_status
                        ? "border-zinc-300 bg-zinc-100 text-zinc-400 cursor-not-allowed"
                        : s.value === "verified"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : s.value === "rejected"
                            ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                            : s.value === "not_verified"
                              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-softBorder bg-white text-zinc-700 hover:bg-zinc-50",
                    )}
                  >
                    {s.value === resort?.verification_status && <Check size={12} aria-hidden />}
                    {s.label}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-semibold text-zinc-600">Reason for status change (optional)</label>
              <textarea
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-softBorder px-3 py-2 text-sm"
                placeholder="Explain why you are changing the status…"
              />
            </div>
          </InfoPanel>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Documents</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {detail.required_document_types.map((type) => {
                const doc = docByType(detail.documents, type);
                if (!doc) {
                  return (
                    <div
                      key={type}
                      className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900"
                    >
                      <p className="font-semibold">{DOC_LABELS[type] ?? type}</p>
                      <p className="mt-2">Not uploaded</p>
                    </div>
                  );
                }
                const src = laravelPublicUrl(doc.url);
                const showImage = isImageUrl(src, doc.original_name);
                return (
                  <div key={type} className="rounded-xl border border-softBorder bg-white p-3">
                    <p className="text-xs font-semibold text-navy">{DOC_LABELS[type] ?? type}</p>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">{doc.original_name ?? "—"}</p>
                    {showImage ? (
                      <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt={doc.original_name ?? type}
                          className="max-h-36 w-full rounded-lg border border-softBorder object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primaryBlue hover:underline"
                      >
                        <FileText size={14} aria-hidden />
                        Open file
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {canDecide ? (
            <div className="space-y-3 border-t border-softBorder pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={listPublicly}
                  onChange={(e) => setListPublicly(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                List on public platform after approval
              </label>
              <div>
                <label className="text-xs font-semibold text-zinc-600">
                  Note to owner (reject or request more documents)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-softBorder px-3 py-2 text-sm text-zinc-800"
                  placeholder="Explain what the owner must fix…"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={action !== null}
                  onClick={() => void handleApprove()}
                  className={cn(
                    "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-4 py-2",
                    "border border-emerald-800 bg-emerald-600 text-sm font-semibold text-white shadow-sm",
                    "transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {action === "approve" ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                  ) : (
                    <Check size={16} aria-hidden />
                  )}
                  Approve
                </button>
                <button
                  type="button"
                  disabled={action !== null}
                  onClick={() => void handleReject()}
                  className={cn(
                    "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-4 py-2",
                    "border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-900",
                    "transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {action === "reject" ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                  ) : (
                    <XCircle size={16} aria-hidden />
                  )}
                  Reject
                </button>
                <button
                  type="button"
                  disabled={action !== null}
                  onClick={() => void handleRequestDocuments()}
                  className={cn(
                    "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-4 py-2",
                    "border border-amber-300 bg-amber-50 text-sm font-semibold text-amber-950",
                    "transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {action === "needs_docs" ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden />
                  ) : (
                    <FileText size={16} aria-hidden />
                  )}
                  Request more docs
                </button>
                <button type="button" onClick={onClose} className="dash-btn-sm ml-auto">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-softBorder pt-4">
              <button type="button" onClick={onClose} className="dash-btn-sm">
                Close
              </button>
            </div>
          )}
        </div>
      ) : null}
    </DashModal>
  );
}
