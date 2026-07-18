import type { NextConfig } from "next";

// No rewrites needed — Next.js Route Handlers under src/app/api/** ARE the
// backend (see ARCHITECTURE.md). The old Express gateway this file used to
// proxy /api/* to was removed; a stale rewrite here was silently hijacking
// the dynamic API routes (/api/notes/[topicId], /api/mcq/[topicId],
// /api/numericals/[topicId]) to a nonexistent localhost:3001, since Next.js
// applies array-form rewrites() as "afterFiles" — after static routes but
// before dynamic ones. Static routes (e.g. /api/upload, /api/chat) were
// unaffected, which is why this went unnoticed.
const nextConfig: NextConfig = {};

export default nextConfig;
