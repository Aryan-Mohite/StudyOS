import { Skeleton } from "@/components/Skeleton";

export default function PlanLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8" role="status" aria-label="Loading study plan">
      <Skeleton className="mb-2 h-7 w-40" />
      <Skeleton className="mb-6 h-4 w-64" />
      <Skeleton className="mb-6 h-28 w-full rounded-2xl" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
