import { laravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
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

export async function fetchTermsPayload(): Promise<TermsPayload | null> {
  const base = laravelApiV1BaseUrl().replace(/\/$/, "");
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
