"use client";

import BookingPaymentReturnModal from "@/components/dashboard/BookingPaymentReturnModal";
import DashCard from "@/components/dash/DashCard";
import Button from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { createPaymentInvoice, paymentCheckoutReturnBase } from "@/lib/api/payment";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { formatPhp } from "@/lib/formatPhp";

type ReservationRow = {
  id: number;
  referenceNo: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  reservationFee: number;
  room?: { id: number; name: string };
};

function extractRows(payload: unknown): ReservationRow[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as { data: ReservationRow[] }).data)) {
    return (payload as { data: ReservationRow[] }).data;
  }
  return [];
}

function GuestHistoryInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const when = searchParams.get("when") === "past" ? "past" : "upcoming";
  const from = searchParams.get("from");
  const fromPayment = from === "payment";
  const fromPaymentFailed = from === "payment_failed";
  const paymentReturnId = searchParams.get("reservation_id");
  const paymentReturnRef = searchParams.get("ref");
  const paymentModalOpen = Boolean(
    paymentReturnId && (fromPayment || fromPaymentFailed),
  );
  const paymentModalFlow = fromPaymentFailed ? "failed" : "success";

  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ success: boolean; data: unknown }>("/guest/reservations", {
        params: { when, perPage: 50 },
      });
      setRows(extractRows(data.data));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [when]);

  const stripPaymentReturnQuery = useCallback(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("from");
    sp.delete("reservation_id");
    sp.delete("ref");
    const next = sp.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
    void load();
  }, [pathname, router, searchParams, load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const onPay = async (id: number) => {
    setPayingId(id);
    try {
      const result = await createPaymentInvoice(id, { checkoutReturnBase: paymentCheckoutReturnBase() });
      if (result.already_confirmed) {
        await load();
        return;
      }
      if (result.invoice_url) {
        window.location.href = result.invoice_url;
      }
    } finally {
      setPayingId(null);
    }
  };

  const tab = (key: "upcoming" | "past", label: string) => (
    <Link
      href={key === "upcoming" ? "/dashboard/guest/history" : "/dashboard/guest/history?when=past"}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        when === key ? "bg-navy text-white shadow-sm" : "text-zinc-600 hover:bg-softGray",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-6">
      {paymentReturnId ? (
        <BookingPaymentReturnModal
          open={paymentModalOpen}
          onClose={stripPaymentReturnQuery}
          flow={paymentModalFlow}
          reservationId={paymentReturnId}
          refFallback={paymentReturnRef}
        />
      ) : null}

      <div>
        <h1 className="dash-page-title">Travel history</h1>
        <p className="dash-page-sub">Upcoming stays and past visits at your home resort.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tab("upcoming", "Upcoming")}
        {tab("past", "Previous")}
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      <DashCard className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">No reservations in this list.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-navy">{r.room?.name ?? "Room"}</p>
                  <p className="text-xs text-zinc-600">
                    {r.checkInDate} → {r.checkOutDate} · {r.referenceNo}
                  </p>
                  <p className="text-xs text-zinc-500">Fee {formatPhp(Number(r.reservationFee))}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-softGray px-2 py-0.5 text-xs font-semibold uppercase text-zinc-600">
                    {r.status.replace("_", " ")}
                  </span>
                  {r.status === "pending_payment" ? (
                    <Button
                      type="button"
                      className="rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                      disabled={payingId === r.id}
                      onClick={() => void onPay(r.id)}
                    >
                      {payingId === r.id ? "…" : "Pay"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashCard>
    </div>
  );
}

export default function GuestHistoryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <GuestHistoryInner />
    </Suspense>
  );
}
