"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserCircle } from "lucide-react";
import type { UserProfile } from "@/types";

/**
 * Sits in the navbar. Fetches /api/profile once on mount and shows a small
 * amber dot + "Complete profile for better results" hint whenever the
 * profile is missing or incomplete. Never blocks navigation — profile is
 * skippable per product decision.
 */
export function ProfileBadge() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: { exists: boolean; profile: UserProfile | null }) => {
        if (!cancelled) {
          setProfile(data.profile);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
