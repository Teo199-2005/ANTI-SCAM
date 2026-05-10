import type { MetadataRoute } from "next";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { siteUrl } from "@/lib/site";

type PaginatedResorts = {
  data?: { id: number }[];
  last_page?: number;
};

async function fetchResortIds(): Promise<number[]> {
  const api = serverLaravelApiV1BaseUrl();
  const ids: number[] = [];
  let page = 1;
  let lastPage = 1;

  try {
    do {
      const res = await fetch(`${api}/public/resorts?perPage=100&page=${page}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (!res.ok) {
        break;
      }
      const json: { data?: PaginatedResorts } = await res.json();
      const payload = json.data;
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      for (const row of rows) {
        ids.push(row.id);
      }
      lastPage = typeof payload?.last_page === "number" ? payload.last_page : 1;
      page += 1;
    } while (page <= lastPage);
  } catch {
    /* build still succeeds with static routes only */
  }

  return ids;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const lastMod = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/resorts",
    "/about",
    "/contact",
    "/login",
    "/register",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: lastMod,
    changeFrequency: path === "/resorts" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const ids = await fetchResortIds();
  const resortRoutes: MetadataRoute.Sitemap = ids.map((id) => ({
    url: `${base}/resorts/${id}`,
    lastModified: lastMod,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...resortRoutes];
}
