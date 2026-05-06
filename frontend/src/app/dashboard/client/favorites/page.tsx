"use client";

import { getFavoriteResortIds, removeFavoriteResortId } from "@/lib/client/favorites";
import { getPublicResort, PublicResort } from "@/lib/api/public";
import { Building2, Heart, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<PublicResort[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (typeof window !== "undefined") {
      const legacy = localStorage.getItem("favorites");
      if (legacy && !localStorage.getItem("rs_client_favorite_resort_ids")) {
        localStorage.setItem("rs_client_favorite_resort_ids", legacy);
      }
    }
    const ids = getFavoriteResortIds();
    const items: PublicResort[] = [];
    for (const id of ids) {
      try {
        const r = await getPublicResort(id);
        items.push(r);
      } catch (err) {
        /* skip removed resorts */
      }
    }
    setFavorites(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRemove = (id: number) => {
    removeFavoriteResortId(id);
    setFavorites((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="dash-page-title flex items-center gap-2">
          <Heart size={22} className="text-rose-500" />
          My favorites
        </h1>
        <p className="dash-page-sub">Resorts you saved from Explore.</p>
      </div>

      {loading ? (
        <div className="dash-card p-10 text-center text-zinc-500">Loading…</div>
      ) : favorites.length === 0 ? (
        <div className="dash-card p-10 text-center">
          <Building2 className="mx-auto mb-3 text-zinc-300" size={40} />
          <p className="text-zinc-600">You haven’t saved any resorts yet.</p>
          <Link href="/dashboard/client/explore" className="mt-4 inline-flex dash-btn-primary">
            Browse resorts →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((r) => (
            <div key={r.id} className="dash-card p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-dash text-lg font-semibold text-navy">{r.name}</h3>
                <button
                  type="button"
                  onClick={() => onRemove(r.id)}
                  className="shrink-0 rounded-lg border border-softBorder p-2 text-rose-600 hover:bg-rose-50"
                  aria-label="Remove from favorites"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {r.address ? (
                <p className="mt-2 flex items-start gap-1 text-sm text-zinc-600">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  {r.address}
                </p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <Link href={`/dashboard/client/explore/${r.id}`} className="dash-btn-sm">
                  View rooms →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

