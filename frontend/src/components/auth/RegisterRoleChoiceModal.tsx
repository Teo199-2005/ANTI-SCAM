"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { DismissibleModalShell } from "@/components/ui/DismissibleModalShell";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { useAuth } from "@/contexts/AuthContext";
import { resolveGuestPostAuthPath } from "@/lib/auth/clientAuthUrls";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MARKETING_MODAL_PANEL_MAX_H,
  MARKETING_MODAL_Z_REGISTER,
} from "@/lib/marketingModalLayout";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const NAVY = "#0d1f3c";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Set when the user started Google OAuth without an existing account. */
  googleToken?: string;
  googleName?: string;
  googleEmail?: string;
  returnTo?: string;
};

type RoleCardProps = {
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  pending?: boolean;
  title: string;
  imageSrc: string;
  imageAlt: string;
  accent: "guest" | "owner";
  bullets: [string, string, string, string];
  cta: string;
  onClose: () => void;
};

function RegisterRoleCard({
  href,
  onSelect,
  disabled,
  pending,
  title,
  imageSrc,
  imageAlt,
  accent,
  bullets,
  cta,
  onClose,
}: RoleCardProps) {
  const isGuest = accent === "guest";

  const inner = (
    <>
      <div className="relative min-h-[min(38vh,17.5rem)] w-full flex-1 overflow-hidden bg-zinc-900 max-sm:min-h-[14rem]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover object-center transition duration-500 motion-safe:group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, 480px"
          unoptimized
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d1f3c]/90 via-[#0d1f3c]/40 to-transparent"
          aria-hidden
        />
        <p className="absolute bottom-2.5 left-3 z-10 font-pop text-base font-extrabold tracking-tight text-white drop-shadow-md sm:bottom-3 sm:text-lg">
          {title}
        </p>
      </div>

      <div className="shrink-0 border-t border-zinc-100 bg-white px-3 py-2.5 sm:px-3.5 sm:py-3">
        <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          {bullets.map((line) => (
            <li
              key={line}
              className="flex items-start gap-1 text-[10px] leading-snug text-zinc-600 sm:text-[11px]"
            >
              <span
                className={cn(
                  "mt-1 h-1 w-1 shrink-0 rounded-full",
                  isGuest ? "bg-clOcean" : "bg-amber-500",
                )}
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <span
          className={cn(
            "mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold sm:text-[13px]",
            isGuest
              ? "bg-gradient-to-r from-clOcean to-clTeal text-white group-hover:brightness-105"
              : "bg-gradient-to-r from-amber-400 to-amber-500 text-[#0d1f3c] group-hover:brightness-105",
          )}
        >
          {pending ? (
            <>
              <Loader2 size={14} className="animate-spin opacity-90" aria-hidden />
              Creating account…
            </>
          ) : (
            <>
              {cta}
              <ArrowRight size={14} className="opacity-90" aria-hidden />
            </>
          )}
        </span>
      </div>
    </>
  );

  const className = cn(
    "group relative flex h-full min-h-[20rem] flex-col overflow-hidden rounded-2xl border-2 bg-white",
    "shadow-[0_8px_32px_-12px_rgba(13,30,60,0.22)]",
    "transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_14px_36px_-10px_rgba(13,30,60,0.28)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clOcean/40 focus-visible:ring-offset-2",
    disabled && "pointer-events-none opacity-60",
    isGuest
      ? "border-sky-200/90 hover:border-sky-400/80"
      : "border-amber-200/90 hover:border-amber-400/80",
  );

  if (href) {
    return (
      <Link href={href} onClick={onClose} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onSelect?.();
      }}
      className={cn(className, "w-full text-left")}
    >
      {inner}
    </button>
  );
}

export function RegisterRoleChoiceModal({
  open,
  onClose,
  googleToken,
  googleName,
  googleEmail,
  returnTo,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestPending, setGuestPending] = useState(false);
  const router = useRouter();
  const { completeGoogleSignup, refreshUser } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const ownerHref = googleToken
    ? (() => {
        const q = new URLSearchParams({
          intent: "owner",
          google_token: googleToken,
        });
        if (returnTo) q.set("returnTo", returnTo);
        if (googleName) q.set("google_name", googleName);
        if (googleEmail) q.set("google_email", googleEmail);
        return `/register?${q.toString()}`;
      })()
    : "/register?intent=owner";

  const guestHref = googleToken ? undefined : "/register?intent=client";

  const completeGuestWithGoogle = async () => {
    if (!googleToken) return;
    if (!acceptTerms) {
      setError("Please accept the terms and privacy policy to continue.");
      return;
    }
    setError(null);
    setGuestPending(true);
    try {
      const { user } = await completeGoogleSignup({
        google_token: googleToken,
        role_intent: "client",
        accept_terms: true,
      });
      await refreshUser();
      onClose();
      router.push(
        resolveGuestPostAuthPath(user.role, {
          returnTo: returnTo ?? "",
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setGuestPending(false);
    }
  };

  if (!mounted || !open) return null;

  return createPortal(
    <DismissibleModalShell
      open={open}
      onClose={onClose}
      zIndexClass={MARKETING_MODAL_Z_REGISTER}
      backdropClassName="bg-[#0d1f3c]/60 backdrop-blur-[4px]"
    >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-role-title"
          className={cn(
            "pointer-events-auto relative flex w-full max-w-[min(100%,56rem)] flex-col overflow-y-auto overflow-x-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-2xl",
            MARKETING_MODAL_PANEL_MAX_H,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative shrink-0 overflow-hidden border-b border-zinc-100 bg-gradient-to-br from-sky-50/80 via-white to-amber-50/40 px-4 py-3.5 sm:px-6 sm:py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  id="register-role-title"
                  className="font-heading text-lg font-bold leading-tight sm:text-xl"
                  style={{ color: NAVY }}
                >
                  Create your account
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  <strong className="font-semibold text-zinc-800">Guests</strong> book verified stays.{" "}
                  <strong className="font-semibold text-zinc-800">Resort owners</strong> list and manage their
                  property.
                </p>
                {googleToken ? (
                  <p className="mt-1.5 text-xs text-zinc-500">
                    Signed in with Google — choose how you will use Anti-Scam PH.
                  </p>
                ) : null}
              </div>
              <ModalCloseButton onClose={onClose} className="shrink-0" />
            </div>
          </div>

          {googleToken ? (
            <label className="mx-3 mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-xs text-zinc-600 sm:mx-4">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-clOcean focus:ring-clOcean/30"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  if (e.target.checked) setError(null);
                }}
              />
              <span>
                I agree to the{" "}
                <Link href="/legal/terms" className="font-semibold text-clOcean hover:underline" onClick={(e) => e.stopPropagation()}>
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="font-semibold text-clOcean hover:underline" onClick={(e) => e.stopPropagation()}>
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          ) : null}

          {error ? (
            <p className="mx-3 mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:mx-4" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
            <RegisterRoleCard
              href={guestHref}
              onSelect={googleToken ? completeGuestWithGoogle : undefined}
              disabled={guestPending}
              pending={guestPending}
              title="Guests"
              imageSrc="/register-guests.png"
              imageAlt="Guests enjoying a verified resort stay"
              accent="guest"
              bullets={[
                "Book verified resorts",
                "Safe online payments",
                "One account, all resorts",
                "Track your bookings",
              ]}
              cta="Continue as guest"
              onClose={onClose}
            />
            <RegisterRoleCard
              href={ownerHref}
              title="Resort Owner"
              imageSrc="/register-resort-owner.png"
              imageAlt="Resort owner welcoming verified guests"
              accent="owner"
              bullets={[
                "Free verification",
                "Booking calendar",
                "Your own website",
                "Manage reservations",
              ]}
              cta="Continue as resort owner"
              onClose={onClose}
            />
          </div>

          <p className="relative shrink-0 border-t border-zinc-100 bg-zinc-50/80 px-4 py-2.5 text-center text-[11px] text-zinc-500 sm:px-6 sm:pr-36">
            Already have an account?{" "}
            <Link href="/login" onClick={onClose} className="font-semibold text-clOcean hover:underline">
              Log in
            </Link>
          </p>

          <div
            className="pointer-events-none absolute bottom-3 right-4 z-20 sm:bottom-3.5 sm:right-5"
            aria-hidden
          >
            <BrandWordmark
              tone="onLight"
              size="2xs"
              displayHeading
              subtitle
              className="items-end text-right opacity-90"
            />
          </div>
        </div>
    </DismissibleModalShell>,
    document.body,
  );
}
