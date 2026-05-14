"use client";

import PageContainer from "@/components/layout/PageContainer";
import ResortJsonLd from "@/components/seo/ResortJsonLd";
import { getPublicResort, getPublicResortBySlug, PublicResort, PublicRoom } from "@/lib/api/public";
import { BedDouble, CalendarDays, MapPin, PhoneCall, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResortDetailPage() {
  const { id: idParam } = useParams();
  const id = String(idParam ?? "");
  const [resort, setResort] = useState<PublicResort | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // If id is non-numeric (e.g. subdomain slug rewritten by Next.js middleware),
        // use the slug endpoint; otherwise use the numeric ID endpoint.
        const isNumeric = /^\d+$/.test(id);
        const data = isNumeric ? await getPublicResort(id) : await getPublicResortBySlug(id);
        setResort(data);
      } catch {
        setError("Resort not found or not publicly available.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  if (loading) {
    return (
      <PageContainer className="section-padding">
        <div className="soft-panel p-10 text-center text-zinc-600">Loading resort…</div>
      </PageContainer>
    );
  }

  if (error || !resort) {
    return (
      <PageContainer className="section-padding">
        <div className="soft-panel p-10 text-center text-red-700">{error ?? "Resort not found."}</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="section-padding">
      <ResortJsonLd resort={resort} />
      {/* Hero */}
      <div className="glass-hero-panel mx-auto mb-8 text-center">
        <h1 className="font-heading text-4xl text-zinc-900 md:text-5xl">{resort.name}</h1>
        {resort.description ? (
          <p className="mx-auto mt-3 max-w-2xl text-zinc-600">{resort.description}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-zinc-600">
          {resort.address ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} />
              {resort.address}
            </span>
          ) : null}
          {resort.contactNumber ? (
            <span className="inline-flex items-center gap-1.5">
              <PhoneCall size={14} />
              {resort.contactNumber}
            </span>
          ) : null}
        </div>
      </div>

      {/* Rooms */}
      <div>
        <h2 className="mb-4 font-heading text-3xl text-zinc-900">Available Rooms</h2>
        {resort.rooms.length === 0 ? (
          <div className="soft-panel p-8 text-center text-zinc-600">
            No rooms available at this time.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resort.rooms.map((room: PublicRoom) => (
              <RoomCard key={room.id} room={room} resortId={id} />
            ))}
          </div>
        )}
      </div>

      {/* Policy */}
      <div className="soft-panel mt-8 p-6">
        <h3 className="font-heading text-2xl text-zinc-900">Booking Policy</h3>
        <ul className="mt-4 space-y-2 text-sm text-zinc-600">
          <li className="inline-flex items-start gap-2">
            <CalendarDays size={14} className="mt-0.5 text-clTeal" />
            A non-refundable reservation fee (amount shown at checkout) is required to confirm your booking.
          </li>
          <li className="inline-flex items-start gap-2">
            <CalendarDays size={14} className="mt-0.5 text-clTeal" />
            The remaining balance is paid directly at the resort upon check-in.
          </li>
          <li className="inline-flex items-start gap-2">
            <CalendarDays size={14} className="mt-0.5 text-clTeal" />
            Your room is locked for 10 minutes during checkout — complete payment promptly.
          </li>
          <li className="inline-flex items-start gap-2">
            <CalendarDays size={14} className="mt-0.5 text-clTeal" />
            Cancellations must be made at least 24 hours before check-in.
          </li>
        </ul>
      </div>
    </PageContainer>
  );
}

function RoomCard({ room, resortId }: { room: PublicRoom; resortId: string }) {
  return (
    <div className="soft-panel flex flex-col p-6">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-2xl text-zinc-900">{room.name}</h3>
        <span className="glass-tag shrink-0">{room.code}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-600">
        <span className="inline-flex items-center gap-1">
          <Users size={13} />
          Up to {room.capacity} guests
        </span>
        <span className="inline-flex items-center gap-1">
          <BedDouble size={13} />
          {room.amenities.slice(0, 3).join(", ")}
          {room.amenities.length > 3 ? " …" : ""}
        </span>
      </div>
      <div className="mt-4 flex-1" />
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-zinc-500">from</p>
          <p className="font-heading text-3xl text-zinc-900">₱{Number(room.basePrice).toLocaleString()}</p>
          <p className="text-xs text-zinc-500">per night</p>
        </div>
        <Link href={`/resorts/${resortId}/rooms/${room.id}`} className="cl-btn-primary">
          Book Room
        </Link>
      </div>
    </div>
  );
}
