"use client";

import PageContainer from "@/components/layout/PageContainer";
import ResortJsonLd from "@/components/seo/ResortJsonLd";
import { getPublicResort, getPublicResortBySlug, PublicResort, PublicRoom } from "@/lib/api/public";
import { BedDouble, CalendarDays, MapPin, PhoneCall, ShieldAlert, ShieldCheck, Star, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPhp } from "@/lib/formatPhp";
import { formatGuestDisplayPhp } from "@/lib/guestRoomPricing";

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
        {resort.verificationStatus && resort.verificationStatus !== 'verified' ? (
          <div className={"mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold " + (
            resort.verificationStatus === 'not_verified'
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : resort.verificationStatus === 'pending' || resort.verificationStatus === 'needs_documents'
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-rose-300 bg-rose-50 text-rose-800"
          )}>
            {resort.verificationStatus === 'not_verified' && <><ShieldAlert size={14} /> Not Yet Verified by Anti-ScamPH</>}
            {(resort.verificationStatus === 'pending' || resort.verificationStatus === 'needs_documents') && <><ShieldCheck size={14} /> Verification In Progress</>}
            {resort.verificationStatus === 'rejected' && <><ShieldAlert size={14} /> Verification Not Approved</>}
          </div>
        ) : null}
        {resort.verificationStatus === 'not_verified' ? (
          <p className="mt-2 max-w-lg mx-auto text-xs text-amber-700">
            This resort has not completed Anti-ScamPH verification. Please verify independently before sending payments.
          </p>
        ) : null}
        {resort.description ? (
          <p className="mx-auto mt-3 max-w-2xl text-zinc-600">{resort.description}</p>
        ) : null}
        {resort.averageRating != null && resort.averageRating > 0 ? (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= Math.round(resort.averageRating!);
                return (
                  <Star
                    key={star}
                    size={16}
                    className={filled ? "fill-amber-400 text-amber-400" : "fill-zinc-300 text-zinc-300"}
                    aria-hidden
                  />
                );
              })}
            </div>
            <span className="text-sm font-semibold text-zinc-700">{resort.averageRating.toFixed(1)}</span>
            <span className="text-sm text-zinc-500">({resort.totalReviews ?? 0} review{(resort.totalReviews ?? 0) !== 1 ? "s" : ""})</span>
          </div>
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
    <div className="soft-panel flex flex-col p-4 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-xl font-bold text-zinc-900 sm:text-2xl">{room.name}</h3>
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
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-zinc-500">from</p>
          <p className="font-heading text-2xl font-bold text-zinc-900 sm:text-3xl">{formatGuestDisplayPhp(room.basePrice, room.reservationFee)}</p>
          <p className="text-xs text-zinc-500">per night</p>
        </div>
        <Link href={`/resorts/${resortId}/rooms/${room.id}`} className="cl-btn-primary text-center">
          Book Room
        </Link>
      </div>
    </div>
  );
}
