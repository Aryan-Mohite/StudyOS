import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * API proxy — rewrites /api/* to the Express gateway.
   * This means the browser only ever talks to :3000 (Next.js dev server),
   * which forwards API calls to :3001 (Express). 
   * The Python AgenticService (:8000) is never exposed to the browser.
   *
   * In production, use a reverse proxy (nginx / Caddy) instead.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:3001"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
