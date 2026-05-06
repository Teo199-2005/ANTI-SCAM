"use client";

import DashModal from "@/components/dash/DashModal";
import type { FormEventHandler, ReactNode } from "react";

type EntityFormModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  submitLabel?: string;
  loading?: boolean;
};

export default function EntityFormModal({
  open,
  title,
  onClose,
  onSubmit,
  children,
  submitLabel = "Save",
  loading = false,
}: EntityFormModalProps) {
  return (
    <DashModal open={open} onClose={onClose} title={title} padded={false}>
      <form onSubmit={onSubmit} className="px-dash-6 pb-dash-6 pt-dash-2">
        <div className="space-y-dash-3">{children}</div>
        <div className="mt-dash-6 flex flex-col-reverse gap-2 border-t border-softBorder pt-dash-4 max-md:w-full md:flex-row md:flex-wrap md:justify-end [&_button]:max-md:w-full">
          <button type="button" onClick={onClose} className="dash-btn-sm px-4 py-2" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="dash-btn-primary" disabled={loading}>
            {loading ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </DashModal>
  );
}
