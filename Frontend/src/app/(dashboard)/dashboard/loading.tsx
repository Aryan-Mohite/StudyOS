import { Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-screen-xl flex-col px-4 py-6 sm:px-5 lg:flex-row lg:gap-0" role="status" aria-label="Loading dashboard">
      <aside className="hidden shrink-0 pr-6 lg:block lg:w-64">
        <Skeleton className="h-64 w-full rounded-xl" />
      </aside>
      <main className="min-w-0 flex-1">
        <Skeleton className="mb-2 h-7 w-64" />
        <Skeleton className="mb-6 h-4 w-48" />
        <Skeleton className="mb-6 h-24 w-full rounded-xl" />
        <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
