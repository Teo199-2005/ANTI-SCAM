"use client";

import { BrowseResortCard } from "@/components/marketing/BrowseResortCard";
import { ResortBrowseFiltersBar } from "@/components/marketing/ResortBrowseFiltersBar";
import { ResortRoomsPreviewModal } from "@/components/marketing/ResortRoomsPreviewModal";
import { ResortWebsitePreviewModal } from "@/components/marketing/ResortWebsitePreviewModal";
import {
  emptyLocationFilter,
  type LocationFilterValue,
} from "@/components/locations/LocationFilterBar";
import TablePaginationBar from "@/components/shared/TablePaginationBar";
import { getFavoriteResortIds, toggleFavoriteResortId } from "@/lib/client/favorites";
import { getPublicResort, listPublicResorts, publicResortToListItem, type PublicResortListItem } from "@/lib/api/public";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { cn } from "@/lib/utils";
import { Building2, Heart, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const PER_PAGE_DEFAULT = 25;
const NAVY = "#0d1f3c";
const GOLD = "#f5a623";

/** Break out of dashboard main padding so the catalog can use full content width. */
const EXPLORE_BLEED = "-mx-4 lg:-mx-8";
const EXPLORE_GUTTER = "px-4 lg:px-8";

const RESORT_GRID_CLASS =
  "grid grid-cols-1 gap-x-3 gap-y-4 pt-1 max-sm:gap-x-2.5 max-sm:gap-y-3.5 sm:grid-cols-2 sm:gap-x-3.5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 xl:gap-x-4";

type PlanFilter = "" | "business_pro" | "standard";

function ExploreResortCard({
  resort,
  favorited,
  onToggleFavorite,
  onViewRooms,
  onViewWebsite,
}: {
  resort: PublicResortListItem;
  favorited: boolean;
  onToggleFavorite: () => void;
  onViewRooms: () => void;
  onViewWebsite: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          "absolute left-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border shadow-md backdrop-blur transition",
          "hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clOcean/40",
          favorited
            ? "border-rose-200/90 bg-white/95 text-rose-500"
            : "border-white/80 bg-white/90 text-zinc-500 hover:text-rose-500",
        )}
        aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
        title={favorited ? "Remove from favorites" : "Save to favorites"}
      >
        <Heart size={17} className={favorited ? "fill-current" : undefined} strokeWidth={2} />
      </button>
      <BrowseResortCard resort={resort} compact onViewRooms={onViewRooms} onViewWebsite={onViewWebsite} />
    </div>
  );
}

function ExplorePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openResortHandled = useRef(false);

  const [resorts, setResorts] = useState<PublicResortListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(emptyLocationFilter());
  const [planFilter, setPlanFilter] = useState<PlanFilter>("");
  const [vipOnly, setVipOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE_DEFAULT);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: PER_PAGE_DEFAULT });

  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [roomsModalResort, setRoomsModalResort] = useState<PublicResortListItem | null>(null);
  const [websiteModalResort, setWebsiteModalResort] = useState<PublicResortListItem | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const legacy = localStorage.getItem("favorites");
    if (legacy && !localStorage.getItem("rs_client_favorite_resort_ids")) {
      localStorage.setItem("rs_client_favorite_resort_ids", legacy);
    }
    setFavoriteIds(getFavoriteResortIds());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await listPublicResorts({
        search: appliedSearch || undefined,
        page,
        perPage,
        plan: planFilter,
        vip_only: vipOnly,
        province_psgc: locationFilter.provincePsgc,
        city_municipality_psgc: locationFilter.cityPsgc,
      });
      const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
      setResorts(rows);
      if (payload && !Array.isArray(payload) && payload.meta) {
        setMeta({
          current_page: payload.meta.current_page ?? page,
          last_page: payload.meta.last_page ?? 1,
          total: payload.meta.total ?? rows.length,
          per_page: payload.meta.per_page ?? perPage,
        });
      } else {
        setMeta({
          current_page: 1,
          last_page: 1,
          total: rows.length,
          per_page: perPage,
        });
      }
    } catch {
      setResorts([]);
      setError("Could not load resorts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, locationFilter, page, perPage, planFilter, vipOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const raw = searchParams.get("openResort")?.trim() ?? "";
    const id = Number(raw);
    if (!raw || !Number.isFinite(id) || id <= 0 || openResortHandled.current) return;

    const fromList = resorts.find((r) => r.id === id);
    if (fromList) {
      openResortHandled.current = true;
      setRoomsModalResort(fromList);
      router.replace("/dashboard/client/explore", { scroll: false });
      return;
    }

    if (loading) return;

    let cancelled = false;
    void (async () => {
      try {
        const detail = await getPublicResort(id);
        if (cancelled) return;
        openResortHandled.current = true;
        setRoomsModalResort(publicResortToListItem(detail));
        router.replace("/dashboard/client/explore", { scroll: false });
      } catch {
        if (!cancelled) openResortHandled.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, resorts, loading, router]);

  const applyFilters = () => {
    setAppliedSearch(query.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setQuery("");
    setAppliedSearch("");
    setLocationFilter(emptyLocationFilter());
    setPlanFilter("");
    setVipOnly(false);
    setPage(1);
  };

  const onToggleFav = (id: number) => {
    toggleFavoriteResortId(id);
    setFavoriteIds(getFavoriteResortIds());
  };

  const resultLabel = loading
    ? "Loading resorts…"
    : `${meta.total} verified resort${meta.total === 1 ? "" : "s"}`;

  return (
    <div className={cn("min-w-0 font-body text-[#111] antialiased", EXPLORE_BLEED)}>
      <div className="sticky top-0 z-20 border-b border-zinc-100/80 bg-white/90 backdrop-blur-xl">
        <div className={cn(EXPLORE_GUTTER, "space-y-3 py-3 sm:py-4")}>
          <header>
            <h1 className="inline-flex items-center gap-2 font-heading text-xl font-bold sm:text-2xl" style={{ color: NAVY }}>
              <Building2 size={22} className="text-clOcean" aria-hidden />
              Explore resorts
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
              Browse verified listings nationwide — same catalog as the public site. View rooms, check availability, and
              book with scam-aware protections.
            </p>
          </header>
          <ResortBrowseFiltersBar
            query={query}
            onQueryChange={(v) => setQuery(sanitizeSearchQuery(v))}
            onSubmit={applyFilters}
            location={locationFilter}
            onLocationChange={(v) => {
              setLocationFilter(v);
              setPage(1);
            }}
            planFilter={planFilter}
            onPlanFilterChange={(v) => {
              setPlanFilter(v);
              setPage(1);
            }}
            vipOnly={vipOnly}
            onVipOnlyChange={(v) => {
              setVipOnly(v);
              setPage(1);
            }}
            onClear={clearFilters}
            resultLabel={resultLabel}
          />
        </div>
      </div>

      <div className={cn(EXPLORE_GUTTER, "pb-8 pt-4 sm:pb-10 sm:pt-6")}>
        {error ? (
          <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-6 py-10 text-center text-rose-800">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              className="mt-4 inline-flex rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-sm"
              style={{ background: `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 45%, #c9840f 100%)` }}
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!error && loading ? (
          <div className={RESORT_GRID_CLASS}>
            {Array.from({ length: Math.min(perPage, 8) }).map((_, i) => (
              <div
                key={i}
                className="min-h-[8.75rem] animate-pulse overflow-hidden rounded-2xl border-2 border-zinc-200 bg-zinc-100 shadow-sm max-sm:flex max-sm:flex-row"
              />
            ))}
          </div>
        ) : null}

        {!error && !loading && resorts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-16 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-zinc-300" aria-hidden />
            <p className="mt-3 font-heading text-lg font-semibold" style={{ color: NAVY }}>
              No resorts match your filters
            </p>
            <p className="mt-1 text-sm text-zinc-500">Try clearing filters or searching a broader area.</p>
            <button
              type="button"
              className="mt-6 inline-flex rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-sm"
              style={{ background: `linear-gradient(165deg, #ffd47a 0%, ${GOLD} 45%, #c9840f 100%)` }}
              onClick={clearFilters}
            >
              Show all resorts
            </button>
          </div>
        ) : null}

        {!error && !loading && resorts.length > 0 ? (
          <>
            <div className={RESORT_GRID_CLASS}>
              {resorts.map((resort) => (
                <ExploreResortCard
                  key={resort.id}
                  resort={resort}
                  favorited={favoriteIds.includes(resort.id)}
                  onToggleFavorite={() => onToggleFav(resort.id)}
                  onViewRooms={() => setRoomsModalResort(resort)}
                  onViewWebsite={() => setWebsiteModalResort(resort)}
                />
              ))}
            </div>

            <TablePaginationBar
              className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50/80 px-2 py-3 shadow-none max-sm:mt-5 sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"
              page={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              perPage={meta.per_page}
              perPageOptions={[25, 50, 75, 100]}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
              }}
            />
          </>
        ) : null}
      </div>

      {roomsModalResort ? (
        <ResortRoomsPreviewModal resort={roomsModalResort} open onClose={() => setRoomsModalResort(null)} />
      ) : null}
      {websiteModalResort ? (
        <ResortWebsitePreviewModal resort={websiteModalResort} open onClose={() => setWebsiteModalResort(null)} />
      ) : null}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="dash-card p-10 text-center text-zinc-600">Loading resorts…</div>}>
      <ExplorePageInner />
    </Suspense>
  );
}
