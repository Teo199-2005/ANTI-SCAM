"use client";

import { useLegalDocuments } from "@/contexts/LegalDocumentModalsContext";
import Link from "next/link";

const btnClass = "text-left hover:text-white/60";

export function FooterLegalLinks() {
  const { openTerms, openPrivacy } = useLegalDocuments();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button type="button" onClick={() => openPrivacy()} className={btnClass}>
        Privacy Policy
      </button>
      <button type="button" onClick={() => openTerms()} className={btnClass}>
        Terms &amp; Conditions
      </button>
      <Link href="/contact" className="hover:text-white/60">
        Support
      </Link>
    </div>
  );
}
