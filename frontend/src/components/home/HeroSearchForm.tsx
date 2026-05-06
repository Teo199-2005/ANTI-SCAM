"use client";

import Button from "@/components/ui/Button";
import { CalendarDays, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * suppressHydrationWarning on each input prevents React from complaining about
 * fdprocessedid / 1Password / LastPass attributes injected by browser extensions.
 * No mount-gate needed — inputs are always rendered so placeholder text is always visible.
 */
export default function HeroSearchForm() {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn]         = useState("");
  const [checkOut, setCheckOut]       = useState("");
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set("search", destination);
    if (checkIn)     params.set("checkIn", checkIn);
    if (checkOut)    params.set("checkOut", checkOut);
    router.push(`/resorts${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <form
      onSubmit={onSearch}
      className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
    >
      {/* Destination */}
      <div className="relative">
        <MapPin
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          suppressHydrationWarning
          className="glass-field-round w-full pl-9"
          placeholder="Destination or resort name"
          autoComplete="off"
          aria-label="Destination or resort name"
          data-lpignore="true"
          data-form-type="other"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>

      {/* Check-in */}
      <div className="relative">
        <CalendarDays
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <label htmlFor="hero-check-in" className="sr-only">Check-in date</label>
        <input
          id="hero-check-in"
          suppressHydrationWarning
          type="date"
          className="glass-field-round w-full pl-9"
          min={today}
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          placeholder="Check-in"
        />
      </div>

      {/* Check-out */}
      <div className="relative">
        <CalendarDays
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <label htmlFor="hero-check-out" className="sr-only">Check-out date</label>
        <input
          id="hero-check-out"
          suppressHydrationWarning
          type="date"
          className="glass-field-round w-full pl-9"
          min={checkIn || today}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          placeholder="Check-out"
        />
      </div>

      {/* Search button */}
      <Button
        type="submit"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap"
      >
        <Search size={15} />
        Search Rooms
      </Button>
    </form>
  );
}
