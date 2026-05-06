"use client";

import DashModal from "@/components/dash/DashModal";
import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  tone = "default",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const confirmClass =
    tone === "danger"
      ? "inline-flex items-center justify-center gap-2 rounded-xl border border-dsError/30 bg-dsError/10 px-4 py-2.5 text-dash-sm font-semibold text-dsError transition hover:bg-dsError/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dsError focus-visible:ring-offset-2 disabled:opacity-50"
      : "dash-btn-primary";

  const titleRow = (
    <span className="flex items-center gap-2">
      {tone === "danger" ? (
        <AlertTriangle size={20} className="shrink-0 text-dsError" aria-hidden />
      ) : (
        <Info size={20} className="shrink-0 text-dsInfo" aria-hidden />
      )}
      <span>{title}</span>
    </span>
  );

  return (
    <DashModal
      open={open}
      onClose={onCancel}
      title={titleRow}
      description={description}
      className="max-w-md"
      padded={false}
    >
      <div className="px-dash-6 pb-dash-6">
        {children ? <div className="mt-dash-2">{children}</div> : null}
        <div className="mt-dash-6 flex flex-col-reverse flex-wrap gap-2 max-md:w-full md:flex-row md:justify-end [&_button]:max-md:w-full">
          <button type="button" onClick={onCancel} className="dash-btn-sm px-4 py-2" disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass} disabled={loading}>
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </DashModal>
  );
}
