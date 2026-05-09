"use client";

import PageContainer from "@/components/layout/PageContainer";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api/client";
import { createPaymentInvoice } from "@/lib/api/payment";
import { getPublicRoom, RoomDetail } from "@/lib/api/public";
import {
  BadgeCheck,
  CreditCard,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Shield,
  User,
} from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = "auth" | "confirm" | "paying";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: resortId } = use(params);
  const searchParams = useSearchParams();
  const roomId   = searchParams.get("roomId")   ?? "";
  const checkIn  = searchParams.get("checkIn")  ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";

  const { user, login, register } = useAuth();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(user ? "confirm" : "auth");

  // Auth form fields
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);

  // Booking
  const [guestCount, setGuestCount] = useState(1);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const redirecting = useRef(false);

  const nights = checkIn && checkOut
    ? Math.max(0, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

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

  const onAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthPending(true);
    try {
      if (authMode === "register") {
        await register({
          name,
          email,
          role_intent: "client",
          password,
          password_confirmation: password,
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

      // 2. Create reservation
      const totalAmount = room ? Number(room.basePrice) * nights : 0;
      const resRes = await apiClient.post("/reservations", {
        resort_id: Number(resortId),
        lock_token: lock.lock_token,
        guest_count: guestCount,
        total_amount: totalAmount,
      });
      const reservation = resRes.data?.data ?? resRes.data;

      // 3. Create Xendit invoice → redirect
      const invoice = await createPaymentInvoice(reservation.id);
      redirecting.current = true;
      window.location.href = invoice.invoice_url;
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Booking failed.";
      setBookingError(msg);
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
                    onClick={() => setAuthMode(m)}
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
                        onChange={(e) => setName(e.target.value)}
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
                      onChange={(e) => setEmail(e.target.value)}
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
                  />
                </div>
                <button
                  type="submit"
                  disabled={authPending}
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
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                />
                {room ? (
                  <p className="mt-1 text-xs text-zinc-500">Max capacity: {room.capacity} guests</p>
                ) : null}
              </div>

              <div className="rounded-xl border border-white/40 bg-white/30 p-4 text-sm backdrop-blur-md">
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Lock size={12} />
                  Your room will be locked for 10 minutes while you complete payment.
                </p>
              </div>

              <button
                type="submit"
                disabled={booking || !room || !roomId || !checkIn || !checkOut || nights <= 0}
                className="cl-btn-primary w-full disabled:opacity-60 disabled:pointer-events-none"
              >
                {booking ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Preparing payment…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <CreditCard size={15} />
                    Pay ₱500 Reservation Fee
                  </span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Booking summary */}
        <div className="space-y-4">
          <div className="soft-panel p-6">
            <h2 className="mb-4 font-heading text-2xl text-zinc-900">Booking Summary</h2>
            {room ? (
              <div className="space-y-3 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">{room.resort.name}</p>
                <p className="text-zinc-600">{room.name} ({room.code})</p>
                <div className="flex justify-between border-t border-zinc-200 pt-3">
                  <span>Check-in</span>
                  <span>{checkIn || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Check-out</span>
                  <span>{checkOut || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nights</span>
                  <span>{nights}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-200 pt-3">
                  <span>Base price / night</span>
                  <span>₱{Number(room.basePrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-amber-700">
                  <span>Reservation fee (now)</span>
                  <span>₱500</span>
                </div>
                <div className="flex justify-between font-semibold text-zinc-500">
                  <span>Balance at resort</span>
                  <span>₱{(Number(room.basePrice) * nights).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-zinc-600">
                <p>{roomError ?? "Room details unavailable."}</p>
                <div className="flex gap-2">
                  <Link href={`/resorts/${resortId}`} className="cl-btn-secondary">
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
