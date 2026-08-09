import { Skeleton } from "@/components/Skeleton";

export default function StudyLoading() {
  return (
    <div className="flex h-[calc(100vh-49px)] overflow-hidden" role="status" aria-label="Loading topic">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface p-3 lg:block">
        <Skeleton className="h-full w-full rounded-lg" />
      </aside>
      <main className="flex flex-1 flex-col gap-4 p-5">
        <Skeleton className="h-5 w-72" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-48 w-full rounded-xl" />
      </main>
    </div>
  );
}
