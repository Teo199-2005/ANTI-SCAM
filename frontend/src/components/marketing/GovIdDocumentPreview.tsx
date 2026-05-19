"use client";

import { laravelStorageUrl } from "@/lib/api/marketingGovId";
import { cn } from "@/lib/utils";
import { ExternalLink, FileText } from "lucide-react";

type Props = {
  /** Absolute URL, blob URL, or Laravel `/storage/...` path */
  src: string | null;
  /** When true, treat as PDF even if URL has no extension */
  isPdf?: boolean;
  className?: string;
  title?: string;
};

function resolveSrc(src: string): string {
  if (src.startsWith("blob:") || src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  return laravelStorageUrl(src);
}

function looksPdf(src: string, isPdf?: boolean): boolean {
  if (isPdf) return true;
  const lower = src.toLowerCase();
  return lower.includes(".pdf") || lower.includes("application/pdf");
}

export default function GovIdDocumentPreview({ src, isPdf, className, title = "Government ID" }: Props) {
  if (!src?.trim()) return null;

  const url = resolveSrc(src);
  const pdf = looksPdf(src, isPdf);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-softBorder bg-zinc-50/80",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-softBorder bg-white/80 px-3 py-2">
        <p className="text-xs font-semibold text-navy">{title}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-clOcean hover:text-clOceanHover"
        >
          Open full size
          <ExternalLink size={12} aria-hidden />
        </a>
      </div>
      {pdf ? (
        <div className="flex flex-col items-center justify-center gap-2 bg-white px-4 py-8 text-center">
          <FileText size={40} className="text-zinc-400" aria-hidden />
          <p className="text-sm text-zinc-600">PDF document on file</p>
          <iframe
            title={title}
            src={url}
            className="mt-2 h-64 w-full max-w-lg rounded-lg border border-softBorder bg-white"
          />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={title} className="max-h-80 w-full object-contain bg-zinc-100" />
      )}
    </div>
  );
}
