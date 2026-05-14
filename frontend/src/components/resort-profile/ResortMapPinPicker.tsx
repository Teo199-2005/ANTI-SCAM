"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef } from "react";

const PH_CENTER = { lat: 14.5995, lng: 120.9842 };

export type ResortMapPinPickerProps = {
  apiKey: string | undefined;
  latitude: number | null;
  longitude: number | null;
  onPinChange: (lat: number | null, lng: number | null) => void;
  disabled?: boolean;
};

/**
 * Draggable marker + map click to set coordinates. Requires Maps JavaScript API key.
 */
export default function ResortMapPinPicker({ apiKey, latitude, longitude, onPinChange, disabled }: ResortMapPinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onPinChangeRef = useRef(onPinChange);
  onPinChangeRef.current = onPinChange;

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;

    const loader = new Loader({ apiKey, version: "weekly" });
    let cancelled = false;

    void loader.load().then((google) => {
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
    });

    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current = null;
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
      <p className="text-xs text-zinc-500">Click the map or drag the pin to set the exact location shown on your public page.</p>
      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-xl border border-softBorder md:h-80" />
    </div>
  );
}
