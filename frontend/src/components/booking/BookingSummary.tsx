import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { ReservationFeeBreakdownPanel } from "@/components/booking/ReservationFeeBreakdownPanel";
import { BedDouble, CalendarDays, Shield } from "lucide-react";

export default function BookingSummary({
  roomName,
  checkIn,
  checkOut,
  reservationFee,
}: {
  roomName: string;
  checkIn: string;
  checkOut: string;
  reservationFee: number;
}) {
  return (
    <aside className="rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/80 p-6 shadow-[0_20px_44px_-20px_rgba(13,30,66,0.14)] md:p-8">
      <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clOcean/10 text-clOcean">
          <BedDouble size={20} strokeWidth={2} />
        </span>
        <div>
          <BrandWordmark tone="onLight" size="xs" className="leading-none" />
          <h3 className="font-heading text-xl font-semibold text-zinc-900">Your reservation snapshot</h3>
        </div>
      </div>
      <div className="mt-5 space-y-2.5 text-sm text-zinc-600">
        <p className="flex items-center gap-2">
          <BedDouble size={14} className="shrink-0 text-clOcean/70" />
          <span>
            Room: <span className="font-medium text-zinc-800">{roomName || "Not selected"}</span>
          </span>
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays size={14} className="shrink-0 text-clOcean/70" />
          Check-in: {checkIn || "—"}
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays size={14} className="shrink-0 text-clOcean/70" />
          Check-out: {checkOut || "—"}
        </p>
      </div>
      <hr className="my-5 border-zinc-200" />
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Official reservation fee (platform)</p>
      <p className="mt-2 inline-flex items-center gap-1 font-heading text-3xl font-bold text-zinc-900">
        <span className="text-2xl font-normal text-clOcean">₱</span>
        {reservationFee.toLocaleString()}
      </p>
      <ReservationFeeBreakdownPanel totalPhp={reservationFee} variant="compact" className="mt-4" />
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
        <Shield size={14} className="mt-0.5 shrink-0 text-clOcean/60" aria-hidden />
        <span>
          Paying here builds a record tied to{" "}
          <BrandWordmark tone="onLight" size="xs" className="inline" /> — never send this fee to a personal account or
          unofficial
          link. Balance after confirmation is with the resort directly.
        </span>
      </p>
    </aside>
  );
}
