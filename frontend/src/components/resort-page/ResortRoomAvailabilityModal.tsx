"use client";

import { RoomAvailabilityBookingPanel } from "@/components/booking/RoomAvailabilityBookingPanel";
import { DismissibleModalShell } from "@/components/ui/DismissibleModalShell";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import {
  MARKETING_MODAL_CENTER_FRAME_CLASS,
  MARKETING_MODAL_PANEL_MAX_H_MD,
  MARKETING_MODAL_Z_NESTED_DEEP,
} from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: number;
  roomName: string;
  resortId: number;
  variant?: "marketing" | "dashboard";
};

/** Modal wrapper around the shared availability calendar booking panel. */
export function ResortRoomAvailabilityModal({
  open,
  onClose,
  roomId,
  roomName,
  resortId,
  variant = "marketing",
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  return createPortal(
    <DismissibleModalShell
      open={open}
      onClose={onClose}
      zIndexClass={MARKETING_MODAL_Z_NESTED_DEEP}
      layout="bare"
      frameClassName={MARKETING_MODAL_CENTER_FRAME_CLASS}
      backdropClassName="bg-zinc-950/75"
    >
      <div
        className={cn(
          "pointer-events-auto relative flex w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-white/40 bg-white p-5 shadow-2xl md:p-6",
          MARKETING_MODAL_PANEL_MAX_H_MD,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avail-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="avail-modal-title" className="font-heading text-xl font-bold text-navy">
              Choose your dates
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{roomName}</p>
          </div>
          <ModalCloseButton onClose={onClose} />
        </div>

        <RoomAvailabilityBookingPanel
          roomId={roomId}
          roomName={roomName}
          resortId={resortId}
          active={open}
          variant={variant}
        />
      </div>
    </DismissibleModalShell>,
    document.body,
  );
}
