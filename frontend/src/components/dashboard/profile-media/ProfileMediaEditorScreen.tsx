"use client";

import { useToast } from "@/components/shared/ToastProvider";
import { listResorts, uploadOwnerResortLogo } from "@/lib/api/resort";
import { uploadBgImage } from "@/lib/api/landingPage";
import { laravelPublicUrl } from "@/lib/publicAsset";
import { fetchImageAsObjectUrl, getCroppedImageBlob } from "@/lib/image/getCroppedImageBlob";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import { cn } from "@/lib/utils";
import { ArrowLeft, ImageIcon, Loader2, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

const LOGO_ASPECT = 1;
const COVER_ASPECT = 16 / 9;

const cropAreaGridClass =
  "[background-image:linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:calc(100%/5)_calc(100%/5)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]";

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function ProfileMediaEditorScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const tabParam = searchParams.get("tab");

  const [loading, setLoading] = useState(true);
  const [logoEditUrl, setLogoEditUrl] = useState<string | null>(null);
  const [bgEditUrl, setBgEditUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<"logo" | "cover">(() => (tabParam === "cover" ? "cover" : "logo"));

  useEffect(() => {
    setTab(tabParam === "cover" ? "cover" : "logo");
  }, [tabParam]);

  const [logoCrop, setLogoCrop] = useState<Point>({ x: 0, y: 0 });
  const [logoZoom, setLogoZoom] = useState(1);
  const [logoPixels, setLogoPixels] = useState<Area | null>(null);
  const [logoReset, setLogoReset] = useState(0);

  const [coverCrop, setCoverCrop] = useState<Point>({ x: 0, y: 0 });
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverPixels, setCoverPixels] = useState<Area | null>(null);
  const [coverReset, setCoverReset] = useState(0);

  const [showGrid, setShowGrid] = useState(true);
  const [blurOutside, setBlurOutside] = useState(false);

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [replaceBusy, setReplaceBusy] = useState<"logo" | "cover" | null>(null);

  const logoFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  const revokeRef = useRef<string[]>([]);
  const trackObjectUrl = useCallback((u: string) => {
    revokeRef.current.push(u);
    return u;
  }, []);

  useEffect(() => {
    return () => {
      revokeRef.current.forEach((u) => URL.revokeObjectURL(u));
      revokeRef.current = [];
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await listResorts({ perPage: 5 });
        const first = data[0];
        if (!first) {
          pushToast({ tone: "error", title: "No resort found", description: "Create your resort from the dashboard first." });
          router.replace("/dashboard/resort/profile");
          return;
        }
        const logo = first.logo_url?.trim() ? String(first.logo_url) : null;
        const bg = (first as { background_image_url?: string }).background_image_url?.trim()
          ? String((first as { background_image_url?: string }).background_image_url)
          : null;

        if (logo) {
          const abs = laravelPublicUrl(logo);
          const u = trackObjectUrl(await fetchImageAsObjectUrl(abs));
          setLogoEditUrl(u);
        } else setLogoEditUrl(null);
        if (bg) {
          const abs = laravelPublicUrl(bg);
          const u = trackObjectUrl(await fetchImageAsObjectUrl(abs));
          setBgEditUrl(u);
        } else setBgEditUrl(null);
      } catch (e) {
        pushToast({ tone: "error", title: "Could not load profile", description: parseApiErrorMessage(e, "Try again.") });
        router.replace("/dashboard/resort/profile");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [pushToast, router, trackObjectUrl]);

  const updateLogoPreview = useMemo(
    () =>
      debounce(async (src: string | null, pixels: Area | null) => {
        if (!src || !pixels) {
          setLogoPreviewUrl(null);
          return;
        }
        try {
          const blob = await getCroppedImageBlob(src, pixels, "image/jpeg", 0.9);
          const next = URL.createObjectURL(blob);
          setLogoPreviewUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return next;
          });
        } catch {
          setLogoPreviewUrl(null);
        }
      }, 320),
    [],
  );

  const updateBgPreview = useMemo(
    () =>
      debounce(async (src: string | null, pixels: Area | null) => {
        if (!src || !pixels) {
          setBgPreviewUrl(null);
          return;
        }
        try {
          const blob = await getCroppedImageBlob(src, pixels, "image/jpeg", 0.88);
          const next = URL.createObjectURL(blob);
          setBgPreviewUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return next;
          });
        } catch {
          setBgPreviewUrl(null);
        }
      }, 320),
    [],
  );

  useEffect(() => {
    if (logoEditUrl && logoPixels) updateLogoPreview(logoEditUrl, logoPixels);
  }, [logoEditUrl, logoPixels, updateLogoPreview]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
      if (bgPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(bgPreviewUrl);
    };
  }, [logoPreviewUrl, bgPreviewUrl]);

  const resetActiveTab = () => {
    if (tab === "logo") {
      setLogoCrop({ x: 0, y: 0 });
      setLogoZoom(1);
      setLogoPixels(null);
      setLogoReset((k) => k + 1);
    } else {
      setCoverCrop({ x: 0, y: 0 });
      setCoverZoom(1);
      setCoverPixels(null);
      setCoverReset((k) => k + 1);
    }
  };

  const onReplaceFile = async (file: File, kind: "logo" | "cover") => {
    setReplaceBusy(kind);
    try {
      const u = trackObjectUrl(URL.createObjectURL(file));
      if (kind === "logo") {
        setLogoEditUrl(u);
        setLogoCrop({ x: 0, y: 0 });
        setLogoZoom(1);
        setLogoPixels(null);
        setLogoReset((k) => k + 1);
      } else {
        setBgEditUrl(u);
        setCoverCrop({ x: 0, y: 0 });
        setCoverZoom(1);
        setCoverPixels(null);
        setCoverReset((k) => k + 1);
      }
    } finally {
      setReplaceBusy(null);
    }
  };

  const save = async () => {
    if (tab === "logo") {
      if (!logoEditUrl || !logoPixels) {
        pushToast({ tone: "info", title: "Adjust the logo", description: "Move or zoom the image so the crop is ready, then save." });
        return;
      }
      setSaving(true);
      try {
        const blob = await getCroppedImageBlob(logoEditUrl, logoPixels, "image/jpeg", 0.92);
        const file = new File([blob], "resort-logo.jpg", { type: "image/jpeg" });
        await uploadOwnerResortLogo(file);
        pushToast({ tone: "success", title: "Logo saved", description: "Your cropped logo is live on the profile and landing page." });
        router.push("/dashboard/resort/profile");
        router.refresh();
      } catch (e) {
        pushToast({
          tone: "error",
          title: "Could not save logo",
          description: parseApiErrorMessage(e, "Check your connection and try again."),
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!bgEditUrl || !coverPixels) {
      pushToast({ tone: "info", title: "Adjust the cover", description: "Position the banner crop, then save." });
      return;
    }
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(bgEditUrl, coverPixels, "image/jpeg", 0.9);
      const file = new File([blob], "resort-cover.jpg", { type: "image/jpeg" });
      await uploadBgImage(file);
      pushToast({ tone: "success", title: "Cover saved", description: "Your hero background has been updated." });
      router.push("/dashboard/resort/profile");
      router.refresh();
    } catch (e) {
      pushToast({
        tone: "error",
        title: "Could not save cover",
        description: parseApiErrorMessage(e, "Check your connection and try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-zinc-600">
        <Loader2 className="h-8 w-8 animate-spin text-primaryBlue" aria-hidden />
        <p className="font-dash text-sm">Loading your media…</p>
      </div>
    );
  }

  const missingLogo = !logoEditUrl;
  const missingBg = !bgEditUrl;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 pb-16 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/resort/profile"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primaryBlue hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to profile
          </Link>
          <h1 className="font-dash text-2xl font-bold tracking-tight text-navy sm:text-3xl">Adjust your resort branding</h1>
          <p className="mt-2 max-w-2xl font-dash text-sm leading-relaxed text-zinc-600 sm:text-base">
            Crop and position your logo and cover image here. After you save, updates apply to your resort profile and guest-facing views.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="dash-btn-sm px-4 py-2.5" onClick={() => router.push("/dashboard/resort/profile")}>
            <X className="h-4 w-4" aria-hidden />
            Cancel
          </button>
          <button type="button" className="dash-btn-sm px-4 py-2.5" onClick={resetActiveTab}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset view
          </button>
          <button type="button" className="dash-btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-softBorderStrong bg-white/90 p-1.5 shadow-sm backdrop-blur-sm">
        {(
          [
            { id: "logo" as const, label: "Resort logo", icon: ImageIcon },
            { id: "cover" as const, label: "Cover photo", icon: ImageIcon },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition min-w-[140px] sm:flex-none",
              tab === id
                ? "bg-gradient-to-b from-primaryBlue to-primaryBlue/90 text-white shadow-md"
                : "text-zinc-600 hover:bg-zinc-50",
            )}
          >
            <Icon className="h-4 w-4 opacity-90" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="dash-card overflow-hidden p-4 sm:p-5">
            {tab === "logo" ? (
              missingLogo ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <p className="max-w-md font-dash text-sm text-zinc-600">Upload a logo on your profile first, then return here to crop and center it.</p>
                  <Link href="/dashboard/resort/profile" className="dash-btn-primary">
                    Go to profile uploads
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Circular crop · drag · zoom</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="dash-btn-sm"
                        disabled={!!replaceBusy}
                        onClick={() => logoFileRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {replaceBusy === "logo" ? "Loading…" : "Replace image"}
                      </button>
                      <input
                        ref={logoFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void onReplaceFile(f, "logo");
                        }}
                      />
                    </div>
                  </div>
                  <div className="relative mx-auto aspect-square w-full max-w-[min(100%,520px)] overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-black/20">
                    <Cropper
                      key={`logo-${logoReset}`}
                      image={logoEditUrl}
                      crop={logoCrop}
                      zoom={logoZoom}
                      aspect={LOGO_ASPECT}
                      cropShape="round"
                      showGrid={false}
                      restrictPosition
                      onCropChange={setLogoCrop}
                      onZoomChange={setLogoZoom}
                      onCropComplete={(_, p) => setLogoPixels(p)}
                      classes={{
                        containerClassName: "rounded-2xl",
                        mediaClassName: "",
                        cropAreaClassName: cn("rounded-full", showGrid && cropAreaGridClass),
                      }}
                      style={{
                        cropAreaStyle: {
                          boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.52)",
                        },
                      }}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                      <span>Zoom</span>
                      <span>{logoZoom.toFixed(2)}×</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.01}
                      value={logoZoom}
                      onChange={(e) => setLogoZoom(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-primaryBlue"
                    />
                  </div>
                </>
              )
            ) : missingBg ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <p className="max-w-md font-dash text-sm text-zinc-600">Upload a background image on your profile first.</p>
                <Link href="/dashboard/resort/profile" className="dash-btn-primary">
                  Go to profile uploads
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Wide banner · 16 : 9 crop</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600">
                      <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="rounded border-zinc-300" />
                      Grid guides
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600">
                      <input type="checkbox" checked={blurOutside} onChange={(e) => setBlurOutside(e.target.checked)} className="rounded border-zinc-300" />
                      Soften outside crop
                    </label>
                    <button
                      type="button"
                      className="dash-btn-sm"
                      disabled={!!replaceBusy}
                      onClick={() => coverFileRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {replaceBusy === "cover" ? "Loading…" : "Replace image"}
                    </button>
                    <input
                      ref={coverFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void onReplaceFile(f, "cover");
                      }}
                    />
                  </div>
                </div>
                <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-black/20" style={{ height: "min(52vw, 380px)" }}>
                  <Cropper
                    key={`cover-${coverReset}`}
                    image={bgEditUrl}
                    crop={coverCrop}
                    zoom={coverZoom}
                    aspect={COVER_ASPECT}
                    cropShape="rect"
                    showGrid={false}
                    restrictPosition
                    onCropChange={setCoverCrop}
                    onZoomChange={setCoverZoom}
                    onCropComplete={(_, p) => setCoverPixels(p)}
                    classes={{
                      containerClassName: cn("rounded-2xl", blurOutside && "backdrop-blur-[2px]"),
                      mediaClassName: cn(blurOutside && "scale-[1.01] brightness-[0.92]"),
                      cropAreaClassName: cn(showGrid && cropAreaGridClass),
                    }}
                    style={{
                      cropAreaStyle: {
                        boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.5)",
                      },
                    }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                    <span>Zoom</span>
                    <span>{coverZoom.toFixed(2)}×</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={coverZoom}
                    onChange={(e) => setCoverZoom(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-primaryBlue"
                  />
                </div>
              </>
            )}

          {tab === "logo" ? (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600">
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="rounded border-zinc-300" />
              Show alignment grid in crop circle
            </label>
          ) : null}
        </div>

        <div className="rounded-xl border border-dashed border-zinc-200 bg-white/80 px-4 py-3 text-xs text-zinc-600">
          <p className="font-semibold text-zinc-800">Tips</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Keep faces and signage inside the safe area on the cover.</li>
            <li>Logos work best with padding inside the circle.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
