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
import { listPublicResorts, type PublicResortListItem } from "@/lib/api/public";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const PER_PAGE_DEFAULT = 25;
const NAVY = "#0d1f3c";
const GOLD = "#f5a623";

/** Full-width catalog shell with comfortable side gutters. */
const LANDING_SHELL =
  "mx-auto w-full max-w-[min(100%,1920px)] ps-[max(0.875rem,env(safe-area-inset-left))] pe-[max(0.875rem,env(safe-area-inset-right))] sm:ps-6 sm:pe-6 lg:ps-10 lg:pe-10 xl:ps-12 xl:pe-12";

/** Mobile: single-column list cards. Desktop: up to 5 columns. */
const RESORT_GRID_CLASS =
  "grid grid-cols-1 gap-x-3 gap-y-4 pt-1 max-sm:gap-x-2.5 max-sm:gap-y-3.5 sm:grid-cols-3 sm:gap-x-3.5 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-4 xl:gap-x-4";

type PlanFilter = "" | "business_pro" | "standard";

export default function BrowseResortsPage() {
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

  const [roomsModalResort, setRoomsModalResort] = useState<PublicResortListItem | null>(null);
  const [websiteModalResort, setWebsiteModalResort] = useState<PublicResortListItem | null>(null);

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

  const resultLabel = loading
    ? "Loading resorts…"
    : `${meta.total} resort${meta.total === 1 ? "" : "s"}`;

  return (
    <div className="min-w-0 bg-white font-body text-[#111] antialiased">
      <div className="sticky top-[3.5rem] z-30 border-b border-zinc-100/80 bg-white/85 backdrop-blur-xl sm:top-[4rem]">
        <div className={`${LANDING_SHELL} py-2.5 sm:py-4`}>
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

      <div className={`${LANDING_SHELL} pb-[max(4rem,env(safe-area-inset-bottom))] pt-3 sm:pb-16 sm:pt-6`}>
        <header className="mb-4 sm:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-clOcean">Anti-Scam PH</p>
          <h1 className="font-heading text-xl font-bold leading-tight" style={{ color: NAVY }}>
            Browse verified resorts
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            Compare listings, view rooms, and book with scam-aware protections nationwide.
          </p>
        </header>
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
            {Array.from({ length: Math.min(perPage, 6) }).map((_, i) => (
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
                <BrowseResortCard
                  key={resort.id}
                  resort={resort}
                  compact
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
        <ResortWebsitePreviewModal
          resort={websiteModalResort}
          open
          onClose={() => setWebsiteModalResort(null)}
        />
      ) : null}
    </div>
  );
}
