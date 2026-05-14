"use client";

import PageContainer from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { createPaymentInvoice, paymentCheckoutReturnBase } from "@/lib/api/payment";
import { getPublicResort, getPublicRoom, RoomDetail } from "@/lib/api/public";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import {
  ArrowRight,
  BadgeCheck,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ReservationFeeBreakdownPanel } from "@/components/booking/ReservationFeeBreakdownPanel";
import { LegalLinkButton } from "@/components/legal/LegalLinkButton";
import PasswordRequirementsMeter from "@/components/auth/PasswordRequirementsMeter";
import {
  sanitizeEmailTyping,
  sanitizeIntegerDigitsOnly,
  sanitizePersonName,
} from "@/lib/inputRestrictions";
import { getPasswordPolicyChecks, passwordPolicyMet } from "@/lib/passwordStrength";
import Link from "next/link";

type Step = "auth" | "confirm" | "paying";

export default function CheckoutPage() {
  const { id: resortIdParam } = useParams();
  const resortId = String(resortIdParam ?? "");
  const searchParams = useSearchParams();
  const roomId   = searchParams.get("roomId")   ?? "";
  const checkIn  = searchParams.get("checkIn")  ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";

  const { user, loading: authLoading, login, register } = useAuth();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [resortSlug, setResortSlug] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(user ? "confirm" : "auth");

  // Auth form fields
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [acceptCheckoutTerms, setAcceptCheckoutTerms] = useState(false);

  // Booking
  const [guestCount, setGuestCount] = useState(1);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const redirecting = useRef(false);

  useEffect(() => {
    const n = Number(resortId);
    if (!resortId || !Number.isFinite(n) || n <= 0) return;
    void getPublicResort(n)
      .then((r) => setResortSlug(r.slug?.trim() || null))
      .catch(() => setResortSlug(null));
  }, [resortId]);

  const resortListingHref = resortSlug
    ? `/resort/${encodeURIComponent(resortSlug)}`
    : `/resorts/${encodeURIComponent(resortId)}`;

  const nights = checkIn && checkOut
    ? Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  const reservationFeePhp = room ? Number(room.reservationFee ?? 500) : 500;
  const balanceAtResortTotal = room && nights > 0 ? Number(room.basePrice) * nights : 0;
  const formatPhp = (amount: number, maxFrac = 2) =>
    `₱${amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFrac,
    })}`;

  useEffect(() => {
    const load = async () => {
      if (!roomId) {
        setRoomError("Missing room selection. Please choose a room again.");
        setLoadingRoom(false);
        return;
      }
      try {
        const r = await getPublicRoom(Number(roomId));
        setRoom(r);
      } catch {
        setRoomError("Unable to load room details. Please try again.");
      } finally {
        setLoadingRoom(false);
      }
    };
    void load();
  }, [roomId]);

  // Advance to confirm step once user is authenticated
  useEffect(() => {
    if (user && step === "auth") {
      setStep("confirm");
    }
  }, [user, step]);

  // If the session drops while on checkout (401 / cookie issues), return to the auth step instead of a blank card.
  useEffect(() => {
    if (authLoading) return;
    if (!user && (step === "confirm" || step === "paying")) {
      setStep("auth");
      setBooking(false);
      setBookingError(null);
    }
  }, [authLoading, user, step]);

  const onAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authMode === "register" && !acceptCheckoutTerms) {
      setAuthError("Please accept the Terms & Conditions and Privacy Policy to continue.");
      return;
    }
    if (authMode === "register" && !passwordPolicyMet(getPasswordPolicyChecks(password))) {
      setAuthError("Password does not meet minimum security requirements.");
      return;
    }
    setAuthPending(true);
    try {
      if (authMode === "register") {
        await register({
          name,
          email,
          role_intent: "client",
          password,
          password_confirmation: password,
          accept_terms: true,
        });
      } else {
        await login(email, password);
      }
      setStep("confirm");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setAuthPending(false);
    }
  };

  const onBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (redirecting.current) return;
    if (!room || !roomId || !checkIn || !checkOut || nights <= 0) {
      setBookingError("Booking details are incomplete. Please reselect your room and dates.");
      return;
    }
    setBookingError(null);
    setBooking(true);
    setStep("paying");

    try {
      // 1. Create booking lock
      const lockRes = await apiClient.post("/booking-locks", {
        room_id: Number(roomId),
        check_in_date: checkIn,
        check_out_date: checkOut,
      });
      const lock = lockRes.data?.data ?? lockRes.data;
      const lockToken =
        typeof lock === "object" && lock !== null && "lock_token" in lock
          ? String((lock as { lock_token?: string }).lock_token ?? "")
          : "";
      if (!lockToken) {
        throw new Error("Could not reserve your dates (missing lock). Please try again.");
      }

      // 2. Create reservation
      const totalAmount = room ? Number(room.basePrice) * nights : 0;
      const resRes = await apiClient.post("/reservations", {
        resort_id: Number(resortId),
        lock_token: lockToken,
        guest_count: guestCount,
        total_amount: totalAmount,
      });
      const reservation = resRes.data?.data ?? resRes.data;
      const reservationId =
        typeof reservation === "object" && reservation !== null && "id" in reservation
          ? Number((reservation as { id?: unknown }).id)
          : NaN;
      if (!Number.isFinite(reservationId)) {
        throw new Error("Could not create your reservation. Please try again.");
      }

      // 3. Create Xendit invoice → redirect (idempotent: may resume pending checkout or sync PAID)
      const invoice = await createPaymentInvoice(reservationId, {
        checkoutReturnBase: paymentCheckoutReturnBase(),
      });
      redirecting.current = true;
      if (invoice.already_confirmed) {
        const refStr =
          typeof reservation === "object" && reservation !== null
            ? String((reservation as { referenceNo?: string }).referenceNo ?? "")
            : "";
        window.location.href = `/payment/success?reservation_id=${reservationId}&ref=${encodeURIComponent(refStr)}`;
        return;
      }
      if (!invoice.invoice_url) {
        throw new Error("No checkout URL returned from payment service.");
      }
      window.location.href = invoice.invoice_url;
    } catch (err: unknown) {
      setBookingError(parseApiErrorMessage(err, "Booking failed. Please try again."));
      setStep("confirm");
    } finally {
      setBooking(false);
    }
  };

  if (loadingRoom) {
    return (
      <PageContainer className="section-padding">
        <div className="soft-panel mx-auto max-w-md p-10 text-center text-zinc-600">
          <Loader2 size={24} className="mx-auto animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="section-padding">
      <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Main checkout card */}
        <div className="soft-panel p-8">
          <h1 className="font-heading text-4xl text-zinc-900">Checkout</h1>

          {step === "auth" && (
            <div className="mt-6">
              <div className="mb-4 flex items-center gap-2">
                <LogIn size={16} className="text-clOcean" />
                <h2 className="font-semibold text-zinc-800">Guest information</h2>
              </div>

              <div className="mb-5 flex gap-2">
                {(["register", "login"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setAuthMode(m);
                      setAuthError(null);
                    }}
                    className={`flex-1 rounded-full border py-2 text-sm font-semibold transition ${
                      authMode === m
                        ? "border-clOcean/40 bg-clOcean/10 text-clOcean"
                        : "border-clSeafoam/60 bg-white/40 text-zinc-600 hover:bg-clSeafoam/40"
                    }`}
                  >
                    {m === "register" ? "New guest" : "Existing account"}
                  </button>
                ))}
              </div>

              <form className="space-y-4" onSubmit={onAuth}>
                {authError ? (
                  <p className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800">
                    {authError}
                  </p>
                ) : null}
                {authMode === "register" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">Full name</label>
                    <div className="relative">
                      <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        className="glass-field pl-9"
                        required
                        placeholder="Maria Santos"
                        value={name}
                        onChange={(e) => setName(sanitizePersonName(e.target.value))}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Email</label>
                  <div className="relative">
                    <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      className="glass-field pl-9"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) =>
                        setEmail(sanitizeEmailTyping(e.target.value).toLowerCase())
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Password</label>
                  <input
                    className="glass-field"
                    type="password"
                    required
                    minLength={8}
                    placeholder={authMode === "register" ? "At least 8 characters" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby={authMode === "register" ? "checkout-password-meter" : undefined}
                  />
                  {authMode === "register" ? (
                    <PasswordRequirementsMeter className="mt-2" password={password} id="checkout-password-meter" />
                  ) : null}
                </div>
                {authMode === "register" ? (
                  <label className="flex items-start gap-2 rounded-xl border border-white/50 bg-white/20 px-3 py-2.5 text-xs text-zinc-700">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-clOcean"
                      checked={acceptCheckoutTerms}
                      onChange={(e) => setAcceptCheckoutTerms(e.target.checked)}
                    />
                    <span>
                      I agree to the{" "}
                      <LegalLinkButton kind="terms">Terms &amp; Conditions</LegalLinkButton> and{" "}
                      <LegalLinkButton kind="privacy">Privacy Policy</LegalLinkButton>
                      . A copy of the Terms will be emailed to you.
                    </span>
                  </label>
                ) : null}
                <button
                  type="submit"
                  disabled={authPending || (authMode === "register" && !acceptCheckoutTerms)}
                  className="cl-btn-primary w-full disabled:opacity-60 disabled:pointer-events-none"
                >
                  {authPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Please wait…
                    </span>
                  ) : authMode === "register" ? (
                    "Continue as Guest"
                  ) : (
                    "Sign in & Continue"
                  )}
                </button>
              </form>
            </div>
          )}

          {(step === "confirm" || step === "paying") && user && (
            <form className="mt-6 space-y-5" onSubmit={onBook}>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
                <BadgeCheck size={15} className="mr-1.5 inline" />
                Booking as <strong>{user.name}</strong> ({user.email})
              </div>

              {bookingError ? (
                <p className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-800">
                  {bookingError}
                </p>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">Number of guests</label>
                <input
                  type="number"
                  className="glass-field"
                  min={1}
                  max={room?.capacity ?? 10}
                  value={guestCount}
                  onChange={(e) => {
                    const cap = room?.capacity ?? 10;
                    const d = sanitizeIntegerDigitsOnly(e.target.value, 3);
                    if (d === "") {
                      setGuestCount(1);
                      return;
                    }
                    const n = parseInt(d, 10);
                    if (!Number.isFinite(n)) return;
                    setGuestCount(Math.min(cap, Math.max(1, n)));
                  }}
                />
                {room ? (
                  <p className="mt-1 text-xs text-zinc-500">Max capacity: {room.capacity} guests</p>
                ) : null}
              </div>

              <ReservationFeeBreakdownPanel totalPhp={reservationFeePhp} />

              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-4 text-sm text-zinc-700">
                <p>
                  Reservation fee due now:{" "}
                  <strong className="tabular-nums text-zinc-900">{formatPhp(reservationFeePhp)}</strong>
                  {room && nights > 0 ? (
                    <>
                      {" "}
                      <span className="text-zinc-500">
                        ({nights} night{nights === 1 ? "" : "s"} · {formatPhp(Number(room.basePrice), 0)}/night).
                      </span>
                    </>
                  ) : null}
                </p>
                {room && balanceAtResortTotal > 0 ? (
                  <p className="mt-2 text-zinc-600">
                    Remaining stay total at check-in:{" "}
                    <span className="tabular-nums font-semibold text-zinc-800">{formatPhp(balanceAtResortTotal)}</span>
                  </p>
                ) : null}
                <p className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
                  <Lock size={13} className="mt-0.5 shrink-0 text-zinc-400" aria-hidden />
                  <span>Your room is held for 10 minutes while you complete payment.</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={booking || !room || !roomId || !checkIn || !checkOut || nights <= 0}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-800/20 bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-none transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {booking ? (
                  <>
                    <Loader2 size={18} className="animate-spin shrink-0" aria-hidden />
                    Opening payment…
                  </>
                ) : (
                  <>
                    Continue — pay securely
                    <ArrowRight size={18} className="shrink-0 opacity-95" aria-hidden />
                  </>
                )}
              </button>

              <p className="text-center text-xs leading-relaxed text-zinc-500">
                Payments are processed by Xendit. You pay the reservation fee here only; the rest is settled at the
                resort.
              </p>
            </form>
          )}
        </div>

        {/* Booking summary */}
        <div className="space-y-4">
          <div className="soft-panel p-6">
            <h2 className="mb-4 font-heading text-2xl text-zinc-900">Booking Summary</h2>
            {room ? (
              <div className="space-y-4 text-sm text-zinc-700">
                <div>
                  <p className="font-heading text-lg font-bold text-navy">{room.resort.name}</p>
                  <p className="mt-0.5 text-zinc-600">
                    {room.name} <span className="text-zinc-400">({room.code})</span>
                  </p>
                </div>
                <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-3">
                  <div className="flex justify-between text-xs font-medium text-zinc-500">
                    <span>Check-in</span>
                    <span className="tabular-nums font-semibold text-zinc-800">{checkIn || "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-zinc-500">
                    <span>Check-out</span>
                    <span className="tabular-nums font-semibold text-zinc-800">{checkOut || "—"}</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200/80 pt-2 text-xs font-medium text-zinc-500">
                    <span>Nights</span>
                    <span className="font-bold text-navy">{nights}</span>
                  </div>
                </div>
                <div className="flex justify-between rounded-lg border border-zinc-200/90 bg-white/80 px-3 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rate / night</span>
                  <span className="tabular-nums text-base font-bold text-zinc-900">{formatPhp(Number(room.basePrice))}</span>
                </div>
                <div className="relative overflow-hidden rounded-xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-emerald-50/90 p-3.5 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800/90">Due now (online)</p>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-700">Reservation fee</span>
                    <span className="tabular-nums font-heading text-2xl font-extrabold tracking-tight text-amber-900">
                      {formatPhp(reservationFeePhp)}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-zinc-600">Locks your dates and starts secure payment.</p>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">At check-in</p>
                      <p className="mt-0.5 text-xs font-medium text-zinc-600">Room total for this stay</p>
                    </div>
                    <span className="shrink-0 tabular-nums text-right text-lg font-bold text-zinc-700">
                      {formatPhp(balanceAtResortTotal)}
                    </span>
                  </div>
                  <p className="mt-2 border-t border-zinc-200/70 pt-2 text-[11px] text-zinc-500">
                    Pay the resort directly — not charged on this page.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-zinc-600">
                <p>{roomError ?? "Room details unavailable."}</p>
                <div className="flex gap-2">
                  <Link href={resortListingHref} className="cl-btn-secondary">
                    Back to resort
                  </Link>
                  <Link href="/resorts" className="cl-btn-secondary">
                    Browse resorts
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="soft-panel p-5 text-sm text-zinc-600">
            <Shield size={15} className="mr-1.5 inline text-clTeal" />
            Payments are processed securely via Xendit. Your card details are never stored on our servers.
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
