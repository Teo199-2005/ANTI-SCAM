"use client";

import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import { getFavoriteResortIds, toggleFavoriteResortId } from "@/lib/client/favorites";
import { listPublicResorts, PublicResortListItem } from "@/lib/api/public";
import { Building2, Heart, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function ExplorePage() {
  const [resorts, setResorts] = useState<PublicResortListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  const load = useCallback(async (q: string, pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPublicResorts({ search: q || undefined, perPage: 12, page: pg });
      setResorts(result?.data ?? []);
      setLastPage(result?.meta?.last_page ?? 1);
    } catch (err) {
      setError("Could not load resorts.");
      setResorts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const legacy = localStorage.getItem("favorites");
      if (legacy && !localStorage.getItem("rs_client_favorite_resort_ids")) {
        localStorage.setItem("rs_client_favorite_resort_ids", legacy);
      }
      setFavoriteIds(getFavoriteResortIds());
    }
  }, []);

  useEffect(() => {
    void load("", 1);
  }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load(search, 1);
  };

  const onToggleFav = (id: number) => {
    toggleFavoriteResortId(id);
    setFavoriteIds(getFavoriteResortIds());
  };

  return (
    <div className="space-y-6">
      <div className="dash-page-header">
        <h1 className="dash-page-title flex items-center gap-2">
          <Building2 size={24} className="text-skyBlue" />
          Explore resorts
        </h1>
        <p className="dash-page-sub">Browse public listings and open rooms to check availability.</p>

        <form onSubmit={onSearch} className="dash-filter-bar mt-5">
          <div className="relative min-w-[200px] flex-1">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              className="dash-input pl-9"
              placeholder="Search by name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="dash-btn-primary shrink-0">
            Search
          </button>
        </form>
      </div>

      <AsyncStatePanel loading={loading} error={error} isEmpty={resorts.length === 0} emptyText="No resorts match your search.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {resorts.map((r) => {
            const favorited = favoriteIds.includes(r.id);
            return (
              <div key={r.id} className="dash-card relative overflow-hidden p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-dash text-lg font-semibold text-navy">{r.name}</h3>
                    {r.address ? (
                      <p className="mt-1 flex items-start gap-1 text-sm text-zinc-600">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-zinc-400" />
                        {r.address}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFav(r.id)}
                    className="shrink-0 rounded-lg border border-softBorder p-2 transition hover:bg-softGray"
                    aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
                    title={favorited ? "Remove from favorites" : "Save to favorites"}
                  >
                    <Heart size={18} className={favorited ? "fill-rose-500 text-rose-500" : "text-zinc-400"} />
                  </button>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-zinc-500">{r.description ?? "Discover rooms and book your stay."}</p>
                {r.priceFrom != null && Number(r.priceFrom) > 0 ? (
                  <p className="mt-2 text-sm font-semibold text-navy">
                    From ₱{Number(r.priceFrom).toLocaleString()} <span className="font-normal text-zinc-500">/ night</span>
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-softBorder pt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {r.activeRoomsCount} room{r.activeRoomsCount === 1 ? "" : "s"} listed
                  </span>
                  <Link href={`/dashboard/client/explore/${r.id}`} className="dash-btn-sm">
                    View rooms →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </AsyncStatePanel>

      {lastPage > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => {
              const p = page - 1;
              setPage(p);
              void load(search, p);
            }}
            className="dash-btn-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-zinc-600">
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage}
            onClick={() => {
              const p = page + 1;
              setPage(p);
              void load(search, p);
            }}
            className="dash-btn-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}

