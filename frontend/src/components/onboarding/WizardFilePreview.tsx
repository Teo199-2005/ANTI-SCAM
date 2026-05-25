"use client";

import { cn } from "@/lib/utils";
import { FileText, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
}

type Props = {
  file: File;
  className?: string;
  onClear?: () => void;
};

export function WizardFilePreview({ file, className, onClear }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImageFile(file)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const showImage = previewUrl != null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50",
        showImage ? "h-24 w-24" : "flex h-16 min-w-[10rem] items-center gap-2 px-3",
        className,
      )}
    >
      {showImage ? (
        <Image src={previewUrl} alt="" fill className="object-cover" unoptimized />
      ) : (
        <>
          <FileText className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          <span className="truncate text-xs font-medium text-slate-700">{file.name}</span>
        </>
      )}
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-1 top-1 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/70"
          aria-label="Remove file"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
