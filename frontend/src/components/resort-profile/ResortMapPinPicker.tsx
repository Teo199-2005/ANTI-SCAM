"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

const PH_CENTER = { lat: 14.5995, lng: 120.9842 };

export type ResortMapPinPickerProps = {
  apiKey: string | undefined;
  latitude: number | null;
  longitude: number | null;
  onPinChange: (lat: number | null, lng: number | null) => void;
  disabled?: boolean;
};

type WindowWithGmAuth = Window & { gm_authFailure?: () => void };

/**
 * Draggable marker + map click to set coordinates. Requires Maps JavaScript API key.
 */
export default function ResortMapPinPicker({ apiKey, latitude, longitude, onPinChange, disabled }: ResortMapPinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onPinChangeRef = useRef(onPinChange);
  const prevGmAuthFailureRef = useRef<(() => void) | undefined>(undefined);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  onPinChangeRef.current = onPinChange;

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    setMapLoadError(null);
    const loader = new Loader({ apiKey, version: "weekly" });
    let cancelled = false;

    const w = window as WindowWithGmAuth;
    prevGmAuthFailureRef.current = w.gm_authFailure;
    w.gm_authFailure = () => {
      if (cancelled) return;
      setMapLoadError(
        "Google rejected this Maps key (referrer, API not enabled, or billing). Fix the key in Google Cloud Console — your profile still saves without the map.",
      );
      mapRef.current = null;
      markerRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };

    void loader
      .load()
      .then((google) => {
        if (cancelled || !containerRef.current) return;

        const hasPin =
          latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
        const center = hasPin ? { lat: latitude as number, lng: longitude as number } : PH_CENTER;

        const map = new google.maps.Map(containerRef.current, {
          center,
          zoom: hasPin ? 16 : 6,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        mapRef.current = map;

        const marker = new google.maps.Marker({
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
      })
      .catch(() => {
        if (cancelled) return;
        setMapLoadError(
          "Could not load Google Maps (network or invalid key). Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and rebuild the app after changing it.",
        );
      });

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current = null;
      w.gm_authFailure = prevGmAuthFailureRef.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init map once per mount / key
  }, [apiKey, disabled]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const hasPin =
      latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
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
      </p>
      {mapLoadError ? (
        <div className="rounded-xl border border-rose-200/90 bg-rose-50/95 px-3 py-3 text-xs text-rose-950">
          <p className="font-semibold">Map unavailable</p>
          <p className="mt-1.5 leading-relaxed">{mapLoadError}</p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px] text-rose-900/95">
            <li>
              <strong>RefererNotAllowedMapError</strong> (console): the browser origin does not match your API key’s
              HTTP referrer allowlist. Add{" "}
              <code className="rounded bg-white/70 px-1">http://localhost:3000/*</code> — the trailing{" "}
              <code className="rounded bg-white/70 px-1">/*</code> is required so paths like{" "}
              <code className="rounded bg-white/70 px-1">/dashboard/resort/profile</code> are allowed. Use{" "}
              <code className="rounded bg-white/70 px-1">http</code> not <code className="rounded bg-white/70 px-1">https</code>{" "}
              for local dev. Also add <code className="rounded bg-white/70 px-1">http://127.0.0.1:3000/*</code> if you open the app via 127.0.0.1.
            </li>
            <li>
              Tenant subdomains: <code className="rounded bg-white/70 px-1">http://*.localhost:3000/*</code>. Production:{" "}
              <code className="rounded bg-white/70 px-1">https://anti-scamph.com/*</code>.
            </li>
            <li>
              Google Cloud → APIs &amp; Services → enable <strong>Maps JavaScript API</strong> and ensure billing is
              active.
            </li>
            <li>
              After editing <code className="rounded bg-white/70 px-1">.env.local</code>, restart{" "}
              <code className="rounded bg-white/70 px-1">next dev</code> (public env is inlined at build for production).
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
