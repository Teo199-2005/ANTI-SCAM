"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { PrivacyDocumentContent } from "@/components/legal/PrivacyDocumentContent";
import { fetchTermsPayload, type TermsPayload, type TermsSection } from "@/lib/legal/termsApi";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LEGAL_MODAL_Z } from "@/lib/marketingModalLayout";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

type LegalDocumentsContextValue = {
  openTerms: () => void;
  openPrivacy: () => void;
  closeAll: () => void;
};

const LegalDocumentsContext = createContext<LegalDocumentsContextValue | null>(null);

export function useLegalDocuments(): LegalDocumentsContextValue {
  const ctx = useContext(LegalDocumentsContext);
  if (!ctx) {
    throw new Error("useLegalDocuments must be used within LegalDocumentModalsProvider");
  }
  return ctx;
}

function TermsSectionBlock({ section }: { section: TermsSection }) {
  return (
    <section className="scroll-mt-4 border-b border-zinc-200/80 py-4 last:border-0 sm:py-5">
      <h3 className="font-heading text-[15px] font-semibold leading-snug text-navy sm:text-base">{section.title}</h3>
      <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-zinc-700 sm:mt-3">
        {section.paragraphs.map((p, i) => (
          <p key={`p-${i}`}>{p}</p>
        ))}
        {section.bullets && section.bullets.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {section.bullets.map((b, i) => (
              <li key={`b-${i}`}>{b}</li>
            ))}
          </ul>
        ) : null}
        {(section.closing_paragraphs ?? []).map((p, i) => (
          <p key={`c-${i}`}>{p}</p>
        ))}
      </div>
    </section>
  );
}

function ModalFrame({
  title,
  subtitle,
  titleId,
  onClose,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Unique id for `aria-labelledby` when multiple modal types exist in the codebase. */
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Reset scroll when switching Terms ↔ Privacy (avoid `children` in deps — new ref every render). */
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = 0;
  }, [titleId, title]);

  return (
    <div className={cn("fixed inset-0", LEGAL_MODAL_Z)} role="presentation">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-zinc-950/55 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      {/*
        Fixed + top + bottom gives a definite height. Grid row minmax(0,1fr) is required so the
        body can shrink below content height and overflow-y-auto actually scrolls (flex-1 alone
        inside abspos flex is unreliable across browsers).
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="legal-modal-shell pointer-events-auto fixed left-1/2 z-10 grid min-h-0 w-[calc(100%-1.25rem)] max-w-3xl -translate-x-1/2 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-zinc-200/95 bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] ring-1 ring-black/5 sm:w-[calc(100%-2rem)]"
        style={{
          top: "max(8rem, calc(env(safe-area-inset-top) + 7rem))",
          bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="min-h-0 shrink-0 border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-clTeal sm:text-xs">Legal</p>
              <h2
                id={titleId}
                className="font-heading text-base font-semibold leading-snug tracking-tight text-navy sm:text-lg"
              >
                {title}
              </h2>
              {subtitle ? (
                <div className="mt-0.5 max-w-prose text-[11px] leading-snug text-zinc-500 sm:text-xs">{subtitle}</div>
              ) : null}
            </div>
            <ModalCloseButton onClose={onClose} className="shrink-0" />
          </div>
        </div>
        <div
          ref={bodyRef}
          className="legal-modal-scroll touch-pan-y min-h-0 overflow-y-auto overscroll-contain border-r border-zinc-200/80 bg-white px-3 py-3 pr-1.5 sm:px-4 sm:py-3.5 sm:pr-2"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function TermsModal({ onClose }: { onClose: () => void }) {
  const [payload, setPayload] = useState<TermsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const data = await fetchTermsPayload();
      if (cancelled) return;
      if (!data) setFailed(true);
      else setPayload(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ModalFrame
      key={payload ? `terms-${payload.version}` : failed ? "terms-failed" : "terms-loading"}
      titleId="legal-modal-terms-title"
      title={payload?.document_title ?? "Terms & Conditions"}
      subtitle={
        payload
          ? `${payload.product_name} · Version ${payload.version} · ${payload.last_updated}`
          : undefined
      }
      onClose={onClose}
    >
      {loading ? <p className="text-sm text-zinc-600">Loading…</p> : null}
      {failed ? (
        <p className="text-sm text-amber-800">
          Could not load terms from the server. Check that the API is running, or contact support@anti-scamph.com.
        </p>
      ) : null}
      {payload ? (
        <article className="rounded-xl border border-zinc-100/90 bg-zinc-50/40 p-3 sm:p-4">
          {payload.sections.map((section) => (
            <TermsSectionBlock key={section.title} section={section} />
          ))}
        </article>
      ) : null}
    </ModalFrame>
  );
}

function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalFrame
      titleId="legal-modal-privacy-title"
      title="Privacy Policy"
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <BrandWordmark tone="onLight" size="xs" className="inline" />
          <span>— operated by The Rising 2 Brothers OPC</span>
        </span>
      }
      onClose={onClose}
    >
      <PrivacyDocumentContent />
    </ModalFrame>
  );
}

export function LegalDocumentModalsProvider({ children }: { children: ReactNode }) {
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const anyOpen = termsOpen || privacyOpen;
  useEffect(() => {
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [anyOpen]);

  const closeAll = useCallback(() => {
    setTermsOpen(false);
    setPrivacyOpen(false);
  }, []);

  const openTerms = useCallback(() => {
    setPrivacyOpen(false);
    setTermsOpen(true);
  }, []);

  const openPrivacy = useCallback(() => {
    setTermsOpen(false);
    setPrivacyOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openTerms, openPrivacy, closeAll }),
    [openTerms, openPrivacy, closeAll],
  );

  return (
    <LegalDocumentsContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <>
              {termsOpen ? <TermsModal onClose={closeAll} /> : null}
              {privacyOpen ? <PrivacyModal onClose={closeAll} /> : null}
            </>,
            document.body,
          )
        : null}
    </LegalDocumentsContext.Provider>
  );
}
