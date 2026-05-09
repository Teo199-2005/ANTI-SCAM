import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const paths: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }> = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/about", changeFrequency: "monthly", priority: 0.8 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
    { path: "/blogs", changeFrequency: "weekly", priority: 0.75 },
    { path: "/booking", changeFrequency: "monthly", priority: 0.7 },
    { path: "/resorts", changeFrequency: "daily", priority: 0.85 },
    { path: "/login", changeFrequency: "yearly", priority: 0.3 },
    { path: "/register", changeFrequency: "yearly", priority: 0.5 },
    { path: "/forgot-password", changeFrequency: "yearly", priority: 0.2 },
  ];

  const now = new Date();
  return paths.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
