"use client";

import { PrivacyDocumentContent } from "@/components/legal/PrivacyDocumentContent";
import { fetchTermsPayload, type TermsPayload, type TermsSection } from "@/lib/legal/termsApi";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col rounded-t-2xl border border-zinc-200/90 bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-clTeal">Legal</p>
            <h2 id="legal-modal-title" className="font-heading text-xl font-semibold tracking-tight text-navy sm:text-2xl">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200/80 p-2 text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
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
      title="Privacy Policy"
      subtitle="Anti-Scam PH — operated by The Rising 2 Brothers OPC"
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
