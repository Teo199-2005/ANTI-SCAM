"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { PrivacyDocumentContent } from "@/components/legal/PrivacyDocumentContent";
import { fetchTermsPayload, type TermsPayload, type TermsSection } from "@/lib/legal/termsApi";
import { X } from "lucide-react";
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
    <section className="scroll-mt-6 border-b border-zinc-200/80 py-6 last:border-0">
      <h3 className="font-heading text-base font-semibold text-navy">{section.title}</h3>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700">
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
    <div
      className="fixed inset-0 z-[600] flex items-end justify-center overflow-x-hidden overflow-y-auto overscroll-contain sm:items-center sm:p-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="fixed inset-0 z-0 bg-zinc-900/50 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      {/*
        min-h-0 on the panel is required: flex items default to min-height:auto and would
        otherwise refuse to shrink below full document height — no inner scroll, header clipped.
      */}
      <div
        className="relative z-10 mx-auto box-border flex w-full min-h-0 min-w-0 max-w-lg flex-col overflow-hidden rounded-t-2xl border border-zinc-200/90 bg-white shadow-2xl max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.25rem))] sm:max-h-[min(80dvh,720px)] sm:max-w-2xl sm:rounded-2xl lg:max-w-3xl my-[max(0.5rem,env(safe-area-inset-bottom))] sm:my-auto"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-clTeal sm:text-xs">Legal</p>
            <h2
              id={titleId}
              className="font-heading text-lg font-semibold leading-snug tracking-tight text-navy sm:text-2xl"
            >
              {title}
            </h2>
            {subtitle ? (
              <div className="mt-1 text-xs leading-snug text-zinc-500 sm:text-sm">{subtitle}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-zinc-200/80 p-2 text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 basis-0 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6 sm:py-5 [scrollbar-gutter:stable]"
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
        <article className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 sm:p-5">
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
