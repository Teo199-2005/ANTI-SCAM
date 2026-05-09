import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Fix workspace root detection warning (multiple lockfiles in parent dirs)
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Avoid build failures when ESLint CLI options drift from eslint-config-next (CI / Linux).
  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    // In dev, skip server-side image optimization entirely.
    // This removes the 20-second hangs caused by Next.js downloading
    // and resizing remote Unsplash/Pexels images on every request.
    unoptimized: process.env.NODE_ENV === "development",

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
