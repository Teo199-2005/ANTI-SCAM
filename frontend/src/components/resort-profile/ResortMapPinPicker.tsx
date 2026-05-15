"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

const PH_CENTER = { lat: 14.5995, lng: 120.9842 };

/** Minimal shape returned by `@googlemaps/js-api-loader` `load()` (typed loosely for Geocoder). */
type GoogleMapsNs = { maps: typeof google.maps };

export type ResortMapPinPickerProps = {
  apiKey: string | undefined;
  latitude: number | null;
  longitude: number | null;
  onPinChange: (lat: number | null, lng: number | null) => void;
  disabled?: boolean;
  /**
   * When province + city/municipality are selected (e.g. "City of Cauayan, Isabela, Philippines"),
   * the map pans here so owners can drop a pin nearby. Requires Geocoding API on the same browser key.
   */
  regionGeocodeQuery?: string | null;
};

type WindowWithGmAuth = Window & { gm_authFailure?: () => void };

function isTenantLocalhostHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.endsWith(".localhost") && h !== "localhost";
}

function hasValidPin(latitude: number | null, longitude: number | null): boolean {
  return latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
}

/** Lines to paste under “Website restrictions” for the Maps JS key (exact origin first — wildcards on *.localhost are unreliable). */
function buildMapsReferrerPasteList(pageOrigin: string): string {
  const lines: string[] = [];
  try {
    const u = new URL(pageOrigin);
    const portPart = u.port ? `:${u.port}` : "";
    lines.push(`${u.origin}/*`);
    if (u.hostname === "localhost" || isTenantLocalhostHostname(u.hostname)) {
      lines.push(`http://*.localhost${portPart}/*`);
    }
  } catch {
    /* ignore */
  }
  lines.push("http://localhost:3000/*", "http://127.0.0.1:3000/*", "https://anti-scamph.com/*");
  return [...new Set(lines)].join("\n");
}

/**
 * Draggable marker + map click to set coordinates. Requires Maps JavaScript API key.
 */
export default function ResortMapPinPicker({
  apiKey,
  latitude,
  longitude,
  onPinChange,
  disabled,
  regionGeocodeQuery,
}: ResortMapPinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const googleNsRef = useRef<GoogleMapsNs | null>(null);
  const onPinChangeRef = useRef(onPinChange);
  const prevGmAuthFailureRef = useRef<(() => void) | undefined>(undefined);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [pageOrigin, setPageOrigin] = useState<string>("");
  const [referrerCopied, setReferrerCopied] = useState(false);
  /** Incremented each time the map instance is created (Geocoder effect waits for a real map). */
  const [mapEpoch, setMapEpoch] = useState(0);

  onPinChangeRef.current = onPinChange;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPageOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    setMapLoadError(null);
    const loader = new Loader({ apiKey, version: "weekly" });
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const w = window as WindowWithGmAuth;
    prevGmAuthFailureRef.current = w.gm_authFailure;
    w.gm_authFailure = () => {
      if (cancelled) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      const tenantLocal = isTenantLocalhostHostname(host);
      const exactLine = origin ? `${origin}/*` : "";
      setMapLoadError(
        tenantLocal
          ? `Google blocked the map while you are on ${origin}. Wildcards like http://*.localhost:3000/* are not always honored for *.localhost. Add this exact referrer first: ${exactLine} — same API key as in NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, “Maps JavaScript API” enabled, then wait a few minutes and hard-refresh.`
          : `Google blocked the map (referrer, wrong API on the key, or billing). Add ${exactLine || "your full origin with /*"} to Website restrictions for the **same** key as in NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, enable **Maps JavaScript API** on that key, wait a few minutes, hard-refresh.`,
      );
      mapRef.current = null;
      markerRef.current = null;
      googleNsRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };

    void loader
      .load()
      .then((googleNs) => {
        if (cancelled || !containerRef.current) return;
        googleNsRef.current = googleNs as GoogleMapsNs;

        const hasPin = hasValidPin(latitude, longitude);
        const center = hasPin ? { lat: latitude as number, lng: longitude as number } : PH_CENTER;

        const map = new googleNs.maps.Map(containerRef.current, {
          center,
          zoom: hasPin ? 16 : 6,
          mapTypeId: googleNs.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        mapRef.current = map;

        /** Gray map fix: tiles often fail until the map knows the real container size (layout / dynamic import). */
        const bumpLayout = () => {
          if (cancelled || !mapRef.current) return;
          const m = mapRef.current;
          const c = m.getCenter();
          googleNs.maps.event.trigger(m, "resize");
          if (c) m.setCenter(c);
        };
        googleNs.maps.event.addListenerOnce(map, "idle", bumpLayout);
        requestAnimationFrame(() => requestAnimationFrame(bumpLayout));
        window.setTimeout(bumpLayout, 120);
        window.setTimeout(bumpLayout, 450);

        const el = containerRef.current;
        if (el && typeof ResizeObserver !== "undefined") {
          let roT: number | undefined;
          resizeObserver = new ResizeObserver(() => {
            if (cancelled) return;
            if (roT !== undefined) window.clearTimeout(roT);
            roT = window.setTimeout(() => bumpLayout(), 80);
          });
          resizeObserver.observe(el);
        }

        const marker = new googleNs.maps.Marker({
          position: hasPin ? center : undefined,
          map: hasPin ? map : undefined,
          draggable: !disabled,
        });
        markerRef.current = marker;

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (disabled || !e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setMap(map);
          marker.setPosition({ lat, lng });
          marker.setDraggable(!disabled);
          onPinChangeRef.current(lat, lng);
        });

        marker.addListener("dragend", () => {
          if (disabled) return;
          const p = marker.getPosition();
          if (!p) return;
          onPinChangeRef.current(p.lat(), p.lng());
        });

        setMapEpoch((n) => n + 1);
      })
      .catch(() => {
        if (cancelled) return;
        setMapLoadError(
          "Could not load Google Maps (network or invalid key). Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and rebuild the app after changing it.",
        );
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      markerRef.current = null;
      mapRef.current = null;
      googleNsRef.current = null;
      w.gm_authFailure = prevGmAuthFailureRef.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init map once per mount / key
  }, [apiKey, disabled]);

  /** Pan map to province + city only when no saved pin — pinned coordinates always take priority. */
  useEffect(() => {
    if (hasValidPin(latitude, longitude)) return;

    const q = regionGeocodeQuery?.trim();
    if (!q || mapEpoch === 0) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      const map = mapRef.current;
      const g = googleNsRef.current;
      if (!map || !g || cancelled || hasValidPin(latitude, longitude)) return;

      const geocoder = new g.maps.Geocoder();
      void geocoder.geocode({ address: q }, (results, status) => {
        if (cancelled || !mapRef.current || hasValidPin(latitude, longitude)) return;
        if (status !== "OK" || !results?.[0]?.geometry?.location) return;
        const loc = results[0].geometry.location;
        mapRef.current.panTo(loc);
        const z = mapRef.current.getZoom();
        if (z !== undefined && z < 11) {
          mapRef.current.setZoom(12);
        }
        g.maps.event.trigger(mapRef.current, "resize");
      });
    }, 420);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [regionGeocodeQuery, mapEpoch, latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const hasPin = hasValidPin(latitude, longitude);
    if (hasPin) {
      const pos = { lat: latitude as number, lng: longitude as number };
      marker.setPosition(pos);
      marker.setMap(map);
      marker.setDraggable(!disabled);
      map.panTo(pos);
      if (map.getZoom() !== undefined && (map.getZoom() ?? 0) < 14) {
        map.setZoom(16);
      }
    } else {
      marker.setMap(null);
    }
  }, [latitude, longitude, disabled]);

  if (!apiKey) {
    return (
      <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
        Set <code className="rounded bg-white/80 px-1 font-mono text-[11px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
        <code className="rounded bg-white/80 px-1 font-mono text-[11px]">frontend/.env.local</code> to drop a pin on the
        map. Street and PSA location still save without it.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        Click the map or drag the pin to set the exact location shown on your public page.
        {hasValidPin(latitude, longitude) ? (
          <span className="mt-1 block text-[11px] text-zinc-400">
            Your saved pin is shown on the map. Changing province or city does not move it — use{" "}
            <strong>Clear map pin</strong> to recenter on your selected location.
          </span>
        ) : regionGeocodeQuery?.trim() ? (
          <span className="mt-1 block text-[11px] text-zinc-400">
            With no pin yet, the map centers on your selected city/municipality (enable{" "}
            <strong>Geocoding API</strong> on the same browser key if it stays on the Philippines view).
          </span>
        ) : null}
      </p>
      {mapLoadError ? (
        <div className="rounded-xl border border-rose-200/90 bg-rose-50/95 px-3 py-3 text-xs text-rose-950">
          <p className="font-semibold">Map unavailable</p>
          <p className="mt-1.5 leading-relaxed">{mapLoadError}</p>
          {apiKey.length >= 8 ? (
            <p className="mt-2 text-[11px] text-rose-900/90">
              Key in this app ends with{" "}
              <code className="rounded bg-white/80 px-1 font-mono text-[11px]">…{apiKey.slice(-4)}</code> — in Google Cloud,
              open <strong>that same</strong> key (name + last digits). A different key will keep failing.
            </p>
          ) : null}
          {pageOrigin ? (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] font-semibold text-zinc-800">
                Google Cloud → Credentials → your Maps browser key → <strong>Website restrictions</strong> → add each
                line (first line is the one Google usually needs for <code className="font-mono">*.localhost</code>):
              </p>
              <pre className="max-h-40 overflow-auto rounded-lg border border-rose-200/80 bg-white/90 p-2.5 font-mono text-[10px] leading-relaxed text-zinc-900">
                {buildMapsReferrerPasteList(pageOrigin)}
              </pre>
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-900 shadow-sm transition hover:bg-rose-50"
                onClick={() => {
                  void navigator.clipboard.writeText(buildMapsReferrerPasteList(pageOrigin)).then(() => {
                    setReferrerCopied(true);
                    window.setTimeout(() => setReferrerCopied(false), 2200);
                  });
                }}
              >
                {referrerCopied ? "Copied" : "Copy referrer lines"}
              </button>
            </div>
          ) : null}
          <ul className="mt-3 list-inside list-disc space-y-0.5 text-[11px] text-rose-900/95">
            <li>
              <strong>API restrictions</strong> on that key must include <strong>Maps JavaScript API</strong> (not only
              Address Validation).
            </li>
            <li>
              <strong>Application restrictions</strong> must be <strong>Websites</strong> (not “IP addresses”) for a
              browser map.
            </li>
            <li>
              After saving in Google, wait up to ~5 minutes, then <strong>Ctrl+Shift+R</strong> on this page. Restart{" "}
              <code className="rounded bg-white/70 px-1 font-mono">next dev</code> if you changed{" "}
              <code className="rounded bg-white/70 px-1">.env.local</code>.
            </li>
          </ul>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={`h-64 w-full overflow-hidden rounded-xl border border-softBorder md:h-80 ${mapLoadError ? "hidden" : ""}`}
        aria-hidden={mapLoadError ? true : undefined}
      />
    </div>
  );
}
