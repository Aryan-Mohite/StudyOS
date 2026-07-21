import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUpcomingRevisions } from "@/lib/db";

// ── GET /api/revision ────────────────────────────────────────────────────────
// Topics due for spaced-repetition revision in the next 7 days (overdue first).
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
  const items = await getUpcomingRevisions(userId);
  return NextResponse.json({ items });
}
