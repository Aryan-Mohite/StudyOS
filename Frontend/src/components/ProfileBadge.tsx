"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { UserCircle } from "lucide-react";
import type { UserProfile } from "@/types";

/** Dispatched by the profile page after a successful save so the navbar
 *  badge (which stays mounted across client-side navigation) updates
 *  immediately instead of waiting for a full page reload. */
export const PROFILE_UPDATED_EVENT = "studyos:profile-updated";

/**
 * Sits in the navbar. Fetches /api/profile on mount, whenever the route
 * changes, whenever the tab regains focus, and whenever a save on the
 * profile page broadcasts PROFILE_UPDATED_EVENT — so the "complete your
 * profile" nudge clears without requiring a full page reload. Never
 * blocks navigation — profile is skippable per product decision.
 */
export function ProfileBadge() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();

  const refetch = useCallback(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: { exists: boolean; profile: UserProfile | null }) => {
        setProfile(data.profile);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch, pathname]);

  useEffect(() => {
    window.addEventListener(PROFILE_UPDATED_EVENT, refetch);
    window.addEventListener("focus", refetch);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, refetch);
      window.removeEventListener("focus", refetch);
    };
  }, [refetch]);

  const incomplete = loaded && !profile?.completed;

  return (
    <Link
      href="/profile"
      className="relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
    >
      <span className="relative">
        <UserCircle size={16} />
        {incomplete && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-surface" />
        )}
      </span>
      <span className="hidden sm:inline">Profile</span>
      {incomplete && (
        <span className="hidden md:inline text-[11px] font-normal text-amber-600">
          Complete profile for better results
        </span>
      )}
    </Link>
  );
}
