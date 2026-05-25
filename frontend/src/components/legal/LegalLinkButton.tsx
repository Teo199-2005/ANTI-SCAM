"use client";

import { useLegalDocuments } from "@/contexts/LegalDocumentModalsContext";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Kind = "terms" | "privacy";

type LegalLinkButtonProps = {
  kind: Kind;
  children: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "children">;

/** Opens the terms or privacy modal; styled like an inline text link. */
export function LegalLinkButton({ kind, children, className = "", ...rest }: LegalLinkButtonProps) {
  const { openTerms, openPrivacy } = useLegalDocuments();

  const open = () => (kind === "terms" ? openTerms() : openPrivacy());

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open();
      }}
      className={`inline bg-transparent p-0 font-semibold text-clOcean underline decoration-clOcean/30 underline-offset-2 hover:text-clOceanHover ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
