import type { ApiEnvelope } from "@/lib/api/types";

export type TermsSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  closing_paragraphs?: string[];
};

export type TermsPayload = {
  document_title: string;
  product_name: string;
  operator: string;
  established: string;
  version: string;
  last_updated: string;
  sections: TermsSection[];
};

const defaultBase = "http://127.0.0.1:8000/api/v1";

export async function fetchTermsPayload(): Promise<TermsPayload | null> {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBase).replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/legal/terms`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const json = (await res.json()) as ApiEnvelope<TermsPayload>;
    if (!json.success || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}
