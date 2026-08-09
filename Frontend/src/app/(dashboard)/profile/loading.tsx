import { Skeleton } from "@/components/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-screen-sm px-5 py-10" role="status" aria-label="Loading profile">
      <Skeleton className="mb-2 h-7 w-40" />
      <Skeleton className="mb-6 h-4 w-80" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
