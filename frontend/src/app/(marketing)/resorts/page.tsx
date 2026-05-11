"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import OwnerValuePropsStrip from "@/components/home/OwnerValuePropsStrip";
import PageContainer from "@/components/layout/PageContainer";
import { listPublicResorts, PublicResortListItem } from "@/lib/api/public";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { BedDouble, MapPin, PhoneCall, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BrowseResortsPage() {
  const [resorts, setResorts] = useState<PublicResortListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async (s: string) => {
    setLoading(true);
    try {
      const res = await listPublicResorts({ search: s, perPage: 24 });
      setResorts(res.data ?? []);
    } catch {
      setResorts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("");
  }, []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(query);
    setSearch(query);
  };

  return (
    <PageContainer className="section-padding">
      <div className="soft-panel mb-8 p-8 text-center">
        <h1 className="font-heading text-4xl text-zinc-900 md:text-5xl">Browse Resorts</h1>
        <p className="mx-auto mt-3 max-w-xl text-zinc-600">
          Discover premium staycation experiences across the Philippines.
        </p>
        <form onSubmit={onSearch} className="mx-auto mt-6 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              className="glass-field pl-9"
              placeholder="Search by name or location…"
              value={query}
              onChange={(e) => setQuery(sanitizeSearchQuery(e.target.value))}
            />
          </div>
          <button type="submit" className="cl-btn-primary">
            Search
          </button>
        </form>
        {search ? (
          <p className="mt-2 text-sm text-zinc-500">
            Showing results for &quot;{search}&quot; —{" "}
            <button
              className="underline hover:text-zinc-800"
              onClick={() => {
                setQuery("");
                setSearch("");
                void load("");
              }}
            >
              clear
            </button>
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="soft-panel p-6">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="h-7 w-3/5 animate-pulse rounded-lg bg-zinc-200" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200" />
              </div>
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-zinc-200" />
              <div className="mt-1.5 h-4 w-4/5 animate-pulse rounded bg-zinc-200" />
              <div className="mt-4 space-y-1.5">
                <div className="h-4 w-3/5 animate-pulse rounded bg-zinc-200" />
                <div className="h-4 w-2/5 animate-pulse rounded bg-zinc-200" />
              </div>
            </div>
          ))}
        </div>
      ) : resorts.length === 0 ? (
        <div className="soft-panel p-10 text-center text-zinc-600">
          No resorts found.{" "}
          {search ? (
            <button className="underline" onClick={() => { setQuery(""); setSearch(""); void load(""); }}>
              Clear search
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {resorts.map((resort) => (
            <Link
              key={resort.id}
              href={`/resorts/${resort.id}`}
              className="soft-panel block p-6 transition hover:shadow-float"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 className="font-heading text-2xl text-zinc-900">{resort.name}</h2>
                <span className="glass-tag shrink-0">
                  <BedDouble size={11} className="inline mr-1" />
                  {resort.activeRoomsCount} rooms
                </span>
              </div>
              {resort.description ? (
                <p className="line-clamp-2 text-sm text-zinc-600">{resort.description}</p>
              ) : null}
              <div className="mt-4 space-y-1.5 text-sm text-zinc-600">
                {resort.address ? (
                  <p className="inline-flex items-center gap-1.5">
                    <MapPin size={13} />
                    {resort.address}
                  </p>
                ) : null}
                {resort.contactNumber ? (
                  <p className="inline-flex items-center gap-1.5">
                    <PhoneCall size={13} />
                    {resort.contactNumber}
                  </p>
                ) : null}
              </div>
              <div className="mt-5">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-clOcean to-clTeal px-4 py-1.5 text-xs font-semibold text-white shadow-cl-btn">
                  View Rooms →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-clOceanDeep/20 bg-gradient-to-br from-clOceanDeep via-clOcean/95 to-clTeal/75 p-8 text-center shadow-cl-card backdrop-blur-xl md:p-10">
        <h2 className="font-heading text-2xl font-bold text-white md:text-3xl">Are you a resort owner?</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 md:text-base">
          List on{" "}
          <BrandWordmark tone="onDark" size="sm" className="inline" />: simplify management, look legit to guests, end
          double bookings, and cut repetitive inquiries.
        </p>
        <div className="mt-6">
          <OwnerValuePropsStrip variant="dark" />
        </div>
        <Link
          href="/register"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-white/30 bg-white px-8 py-3 text-sm font-bold text-clOcean shadow-lg transition hover:bg-clSand active:scale-[0.985]"
        >
          List your resort — get started free →
        </Link>
      </div>
    </PageContainer>
  );
}
