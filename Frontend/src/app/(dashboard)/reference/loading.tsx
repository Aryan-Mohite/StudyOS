import { Skeleton } from "@/components/Skeleton";

export default function ReferenceLoading() {
  return (
    <div className="mx-auto max-w-xl px-5 py-12" role="status" aria-label="Loading reference material">
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-72" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
