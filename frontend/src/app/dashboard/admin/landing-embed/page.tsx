"use client";

import DashCard from "@/components/dash/DashCard";
import AsyncStatePanel from "@/components/shared/AsyncStatePanel";
import { useToast } from "@/components/shared/ToastProvider";
import { updateAdminResortLandingEmbed } from "@/lib/api/admin";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import LocationFilterBar, {
  emptyLocationFilter,
  locationFilterToParams,
  type LocationFilterValue,
} from "@/components/locations/LocationFilterBar";
import { getResort, listResorts, type ResortItem } from "@/lib/api/resort";
import { sanitizeSearchQuery } from "@/lib/inputRestrictions";
import { siteUrl } from "@/lib/site";
import { extractLaravelMeta, type LaravelTableMeta, type SortDir } from "@/lib/tableSortPagination";
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Search, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function buildPageWindow(current: number, last: number): (number | "gap")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const out: (number | "gap")[] = [];
  const addGap = () => {
    if (out[out.length - 1] !== "gap") out.push("gap");
  };
  out.push(1);
  const wing = 2;
  const start = Math.max(2, current - wing);
  const end = Math.min(last - 1, current + wing);
  if (start > 2) addGap();
  for (let p = start; p <= end; p++) out.push(p);
  if (end < last - 1) addGap();
  if (last > 1) out.push(last);
  return out;
}

function PublicLandingUrlCell({ subdomain }: { subdomain?: string | null }) {
  const slug = typeof subdomain === "string" ? subdomain.trim() : "";
  if (!slug) {
    return <span className="text-xs text-zinc-500">No public URL yet.</span>;
  }
  const href = `${siteUrl()}/resort/${encodeURIComponent(slug)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-left text-sm font-medium text-sky-700 underline-offset-2 hover:text-sky-900 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {href}
    </a>
  );
}

export default function AdminLandingEmbedPage() {
  const { pushToast } = useToast();
  const [resorts, setResorts] = useState<ResortItem[]>([]);
  const [meta, setMeta] = useState<LaravelTableMeta | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>(emptyLocationFilter);

  const [selectedId, setSelectedId] = useState<number | "">("");
  const [detailSubdomain, setDetailSubdomain] = useState<string | null>(null);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadList = async (q: string, pg: number, dir: SortDir, loc: LocationFilterValue = locationFilter) => {
    setLoadingList(true);
    try {
      const res = await listResorts({
        search: q || undefined,
        perPage,
        page: pg,
        sort_by: "name",
        sort_dir: dir,
        ...locationFilterToParams(loc),
      });
      setResorts(res.data ?? []);
      setMeta(extractLaravelMeta(res));
      setListError(null);
    } catch {
      setResorts([]);
      setMeta(null);
      setListError("Failed to load resorts.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadList("", 1, "asc");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectResort = async (id: number | "") => {
    setSelectedId(id);
    setDetailSubdomain(null);
    setDetailName(null);
    if (id === "") {
      setYoutubeUrl("");
      setEnabled(false);
      return;
    }
    setLoadingDetail(true);
    try {
      const r = await getResort(id);
      setYoutubeUrl(r.admin_landing_youtube_url ?? "");
      setEnabled(Boolean(r.admin_landing_embed_enabled));
      setDetailSubdomain(r.subdomain ?? null);
      setDetailName(r.name);
    } catch {
      pushToast({ title: "Could not load resort", description: "Try again or pick another resort.", tone: "error" });
      setSelectedId("");
    } finally {
      setLoadingDetail(false);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = sanitizeSearchQuery(query);
    setSearch(q);
    setPage(1);
    void loadList(q, 1, sortDir);
  };

  const toggleNameSort = () => {
    const next: SortDir = sortDir === "asc" ? "desc" : "asc";
    setSortDir(next);
    setPage(1);
    void loadList(search, 1, next);
  };

  const onSave = async () => {
    if (selectedId === "") {
      pushToast({ title: "Select a resort", description: "Choose which property this intro applies to.", tone: "warning" });
      return;
    }
    setSaving(true);
    try {
      await updateAdminResortLandingEmbed(selectedId, {
        admin_landing_embed_enabled: enabled,
        admin_landing_youtube_url: youtubeUrl.trim() === "" ? null : youtubeUrl.trim(),
      });
      pushToast({
        title: "Saved",
        description: enabled
          ? "Guests on this resort’s landing page will see the intro video."
          : "Intro video is turned off for this resort.",
        tone: "success",
      });
      void loadList(search, page, sortDir);
    } catch (e: unknown) {
      pushToast({
        title: "Could not save",
        description: parseApiErrorMessage(e, "Check the YouTube link and try again."),
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const previewSlug = detailSubdomain?.trim();
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? 0;
  const rangeFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * perPage, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">Landing intro video</h1>
        <p className="dash-page-sub mt-1 max-w-2xl">
          Attach a YouTube video to specific resorts. When enabled, visitors opening that resort&apos;s public landing
          page see a full-screen branded intro that autoplays (muted). They must watch for 10 seconds before they can
          continue.
        </p>
      </div>

      <DashCard className="p-6">
        <h2 className="mb-1 inline-flex items-center gap-2 font-dash text-lg font-semibold text-navy">
          <Video size={18} className="text-skyBlue" aria-hidden />
          YouTube link & toggle
        </h2>
        <p className="mb-4 text-sm text-zinc-600">
          {selectedId === "" ? "Select a resort from the table below." : detailName ?? `Resort #${selectedId}`}
        </p>

        {loadingDetail ? (
          <div className="flex items-center gap-2 py-8 text-zinc-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading resort…
          </div>
        ) : selectedId === "" ? (
          <p className="py-6 text-sm text-zinc-600">Click a row in the table below to edit that resort&apos;s intro video.</p>
        ) : (
          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-navy/30 text-sky-600 focus:ring-sky-500"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>
                <span className="font-semibold text-navy">Show intro on public landing page</span>
                <span className="mt-0.5 block text-sm text-zinc-600">
                  Applies only to this resort&apos;s public landing URL when the page is live (path{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">/resort/&lt;subdomain&gt;</code>
                  ).
                </span>
              </span>
            </label>

            <div>
              <label htmlFor="yt-url" className="mb-1 block text-sm font-medium text-navy">
                YouTube URL or video ID
              </label>
              <input
                id="yt-url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or youtu.be/…"
                className="dash-input w-full max-w-xl"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Paste a normal watch link, Shorts link, or embed URL. When the intro is off, you can clear this field
                and save to remove the stored link.
              </p>
            </div>

            {previewSlug ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/resort/${encodeURIComponent(previewSlug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dash-btn-secondary inline-flex items-center gap-2"
                >
                  Open public landing
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-amber-800">This tenant has no subdomain yet — the public landing URL is unavailable.</p>
            )}

            <div className="pt-2">
              <button type="button" className="dash-btn-primary" disabled={saving} onClick={() => void onSave()}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </DashCard>

      <DashCard className="p-6">
        <h2 className="mb-1 inline-flex items-center gap-2 font-dash text-lg font-semibold text-navy">
          <Video size={18} className="text-skyBlue" aria-hidden />
          Resorts
        </h2>
        <p className="mb-4 text-sm text-zinc-600">Search and pick a resort to configure.</p>

        <form onSubmit={onSearch} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, address, or phone…"
              className="dash-input w-full pl-9"
            />
          </div>
          <button type="submit" className="dash-btn-secondary shrink-0">
            Search
          </button>
          <LocationFilterBar
            label="Resort location"
            value={locationFilter}
            onChange={(next) => {
              setLocationFilter(next);
              setPage(1);
              void loadList(search, 1, sortDir, next);
            }}
          />
        </form>

        <AsyncStatePanel loading={loadingList} error={listError} isEmpty={!loadingList && resorts.length === 0}>
          <div className="overflow-x-auto rounded-xl border border-navy/10">
            <table className="dash-table">
              <thead>
                <tr>
                  <th className="w-12 text-center" scope="col">
                    <span className="sr-only">Select</span>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 font-dash font-semibold text-navy transition hover:text-sky-700"
                      onClick={() => toggleNameSort()}
                      disabled={loadingList}
                    >
                      Name
                      {sortDir === "asc" ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                      )}
                      <span className="sr-only">, sort {sortDir === "asc" ? "ascending" : "descending"}</span>
                    </button>
                  </th>
                  <th scope="col">Public landing</th>
                  <th scope="col">Intro</th>
                </tr>
              </thead>
              <tbody>
                {resorts.map((r) => (
                  <tr
                    key={r.id}
                    className={selectedId === r.id ? "bg-sky-50/80" : undefined}
                    onClick={() => void onSelectResort(r.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        void onSelectResort(r.id);
                      }
                    }}
                  >
                    <td className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-navy/30 text-sky-600 focus:ring-sky-500"
                        checked={selectedId === r.id}
                        aria-label={`Select ${r.name}`}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) void onSelectResort(r.id);
                          else if (selectedId === r.id) void onSelectResort("");
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="font-medium text-navy">{r.name}</td>
                    <td className="max-w-[min(24rem,52vw)] align-top">
                      <PublicLandingUrlCell subdomain={r.subdomain} />
                    </td>
                    <td>
                      {r.admin_landing_embed_enabled ? (
                        <span className="dash-badge-emerald">On</span>
                      ) : (
                        <span className="dash-badge-slate">Off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && !loadingList ? (
            <div className="mt-3 flex flex-col gap-3 border-t border-navy/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-600">
                Showing{" "}
                <span className="font-medium text-navy">
                  {rangeFrom}–{rangeTo}
                </span>{" "}
                of <span className="font-medium text-navy">{total}</span>
                {lastPage > 1 ? (
                  <>
                    {" "}
                    · Page <span className="font-medium text-navy">{page}</span> of {lastPage}
                  </>
                ) : null}
              </p>
              {lastPage > 1 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="dash-btn-ghost text-sm"
                    disabled={page <= 1 || loadingList}
                    onClick={() => {
                      const p = Math.max(1, page - 1);
                      setPage(p);
                      void loadList(search, p, sortDir);
                    }}
                  >
                    Previous
                  </button>
                  <div className="flex flex-wrap items-center gap-1">
                    {buildPageWindow(page, lastPage).map((item, idx) =>
                      item === "gap" ? (
                        <span key={`gap-${idx}`} className="px-1 text-zinc-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={
                            item === page
                              ? "min-w-[2.25rem] rounded-lg bg-navy px-2 py-1.5 text-sm font-bold text-white"
                              : "dash-btn-ghost min-w-[2.25rem] px-2 py-1.5 text-sm"
                          }
                          disabled={loadingList}
                          onClick={() => {
                            setPage(item);
                            void loadList(search, item, sortDir);
                          }}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    className="dash-btn-ghost text-sm"
                    disabled={page >= lastPage || loadingList}
                    onClick={() => {
                      const p = Math.min(lastPage, page + 1);
                      setPage(p);
                      void loadList(search, p, sortDir);
                    }}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </AsyncStatePanel>
      </DashCard>
    </div>
  );
}
