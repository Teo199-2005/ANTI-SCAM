"use client";

import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Figma-style image wrapper: falls back to a plain `<img>` if Next/Image fails to load.
 */
export function ImageWithFallback({ className, onError, src, alt, fill, ...rest }: ImageProps) {
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      onError?.(e);
      setFailed(true);
    },
    [onError]
  );

  if (failed && typeof src === "string") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- intentional fallback when optimized image fails
      <img
        src={src}
        alt={alt ?? ""}
        className={cn(fill && "absolute inset-0 h-full w-full", className)}
        decoding="async"
      />
    );
  }

  return (
    <Image
      {...rest}
      src={src}
      alt={alt ?? ""}
      fill={fill}
      className={className}
      onError={handleError}
    />
  );
}
