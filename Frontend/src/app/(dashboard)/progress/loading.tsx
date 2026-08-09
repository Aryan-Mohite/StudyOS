import { Skeleton } from "@/components/Skeleton";

export default function ProgressLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8" role="status" aria-label="Loading progress">
      <Skeleton className="mb-2 h-7 w-40" />
      <Skeleton className="mb-6 h-4 w-64" />
      <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
