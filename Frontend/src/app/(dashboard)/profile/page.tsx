"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PROFILE_UPDATED_EVENT } from "@/components/ProfileBadge";
import type { UserProfile } from "@/types";

const EDUCATION_LEVELS = [
  "Diploma 1st Year",
  "Diploma 2nd Year",
  "Diploma 3rd Year",
  "B.Tech 1st Year",
  "B.Tech 2nd Year",
  "B.Tech 3rd Year",
  "B.Tech 4th Year",
  "M.Tech",
  "MBA",
  "MBBS",
  "Other",
];

type FormFields = {
  name: string;
  education_level: string;
  course: string;
  university: string;
};

const EMPTY: FormFields = { name: "", education_level: "", course: "", university: "" };

export default function ProfilePage() {
  const [form, setForm] = useState<FormFields>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: { exists: boolean; profile: UserProfile | null }) => {
        if (data.profile) {
          setForm({
            name: data.profile.name ?? "",
            education_level: data.profile.education_level ?? "",
            course: data.profile.course ?? "",
            university: data.profile.university ?? "",
          });
        }
      })
      .catch(() => setError("Could not load your profile — you can still fill it in below."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to save profile.");
      setSavedAt(Date.now());
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const update = (field: keyof FormFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const isComplete = form.name && form.education_level && form.course && form.university;

  return (
    <div className="mx-auto max-w-screen-sm px-5 py-10">
      <h1 className="font-display text-2xl font-bold text-gray-900">Your profile</h1>
      <p className="mt-1 text-sm text-gray-500">
        This helps StudyOS calibrate notes, MCQs, and numericals to your course and year. It&apos;s
        optional, but generated content will be more relevant once it&apos;s filled in.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <span className="text-sm font-semibold text-gray-900">Details</span>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              <Field label="Name">
                <input
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.name}
                  onChange={update("name")}
                  placeholder="e.g. Aryan Mohite"
                />
              </Field>

              <Field label="Ongoing education">
                <select
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.education_level}
                  onChange={update("education_level")}
                >
                  <option value="">Select…</option>
                  {EDUCATION_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Course">
                <input
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.course}
                  onChange={update("course")}
                  placeholder="e.g. CS, MBA, MBBS"
                />
              </Field>

              <Field label="University / Board">
                <input
                  className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.university}
                  onChange={update("university")}
                  placeholder="e.g. SPPU, VTU, Mumbai University"
                />
              </Field>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {savedAt && !error && <p className="text-sm text-emerald-600">Saved.</p>}
              {!isComplete && (
                <p className="text-xs text-amber-600">
                  Complete all four fields so generated content can be tailored to you.
                </p>
              )}

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
