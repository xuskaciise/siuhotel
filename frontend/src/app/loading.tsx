import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Skeleton className="size-14 rounded-2xl" />
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-5 w-40 rounded-md" />
        <Skeleton className="h-3 w-56 rounded-md" />
      </div>
    </div>
  );
}
