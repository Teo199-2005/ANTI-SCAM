import type { NextConfig } from "next";
import path from "path";

const baseSecurityHeaders: { key: string; value: string }[] = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  /**
   * Lock the tracing root to this app directory. If a parent folder (e.g. the user profile)
   * contains another `package-lock.json`, Next.js may otherwise pick that as the workspace root,
   * which can break server bundles and chunk resolution (missing `./NNNN.js` under `.next/server`).
   */
  outputFileTracingRoot: path.join(__dirname),

  // Avoid build failures when ESLint CLI options drift from eslint-config-next (CI / Linux).
  eslint: {
    ignoreDuringBuilds: true,
  },

  async redirects() {
    return [
      { source: "/landing-preview", destination: "/", permanent: true },
      { source: "/terms", destination: "/", permanent: true },
      { source: "/privacy", destination: "/", permanent: true },
    ];
  },

  async headers() {
    const headers =
      process.env.NODE_ENV === "production"
        ? [
            ...baseSecurityHeaders,
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]
        : [...baseSecurityHeaders];

    return [{ source: "/(.*)", headers }];
  },

  images: {
    // In dev, skip server-side image optimization entirely.
    // This removes the 20-second hangs caused by Next.js downloading
    // and resizing remote Unsplash/Pexels images on every request.
    unoptimized: process.env.NODE_ENV === "development",

    qualities: [75, 100],

    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],

    // Cache successfully fetched images for 24h in production
    minimumCacheTTL: 60 * 60 * 24,
  },
};

export default nextConfig;
