import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const canvas = cn(
  "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10 sm:py-10 lg:gap-14 lg:px-12 lg:py-12",
  "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)] dark:backdrop-blur-xl",
);

export function RecentBookingsSkeleton() {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2rem] bg-card p-6 shadow-elevation-soft dark:bg-card/95 dark:shadow-[0px_24px_60px_rgba(94,212,255,0.05)] dark:backdrop-blur-xl sm:p-8",
      )}
    >
      <Skeleton className="mb-6 h-7 w-48 rounded-lg sm:h-8 sm:w-56" />
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3 max-lg:hidden">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-4 border-0 py-2">
            <div className="flex min-w-[180px] items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-40 max-sm:hidden" />
            <Skeleton className="h-6 w-20 rounded-full max-sm:hidden" />
            <Skeleton className="h-4 w-28 max-md:hidden" />
            <Skeleton className="ml-auto size-9 rounded-xl max-sm:ml-0" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="size-12 rounded-full" />
      </div>
    </div>
  );
}

function ChartSectionSkeleton() {
  return (
    <div
      className={cn(
        "h-full min-h-[360px] rounded-3xl bg-card p-6 shadow-elevation-soft sm:p-8",
        "dark:bg-card/90 dark:shadow-[0px_24px_60px_rgba(94,212,255,0.05)] dark:backdrop-blur-xl",
      )}
    >
      <Skeleton className="h-6 w-44 rounded-lg" />
      <div className="mt-8 flex h-[280px] min-h-0 items-end justify-between gap-2 px-2 sm:gap-3">
        {Array.from({ length: 7 }).map((_, i) => {
          const heights = ["h-[45%]", "h-[58%]", "h-[50%]", "h-[62%]", "h-[54%]", "h-[70%]", "h-[52%]"] as const;
          return (
            <Skeleton
              key={i}
              className={cn("min-h-0 flex-1 rounded-t-lg rounded-b-none", heights[i] ?? "h-[50%]")}
            />
          );
        })}
      </div>
    </div>
  );
}

function StaffSectionSkeleton() {
  return (
    <div
      className={cn(
        "flex h-full min-h-[360px] flex-col rounded-[2rem] bg-card p-6 shadow-elevation-soft sm:p-8",
        "dark:bg-card/95 dark:shadow-[0px_24px_60px_rgba(94,212,255,0.05)] dark:backdrop-blur-xl",
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-muted/30 p-2 dark:bg-[#1a2230]/40">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="size-9 shrink-0 rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="mx-auto mt-4 h-4 w-40" />
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className={canvas}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl flex-1 space-y-3">
          <Skeleton className="h-10 w-[min(100%,20rem)] rounded-lg sm:h-12" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <Skeleton className="h-4 w-[80%] max-w-lg" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-11 w-40 rounded-full" />
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </div>

      <section className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4 xl:gap-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-4 rounded-[2rem] bg-card p-6 pl-7 shadow-elevation-soft dark:bg-card/95 dark:shadow-[0px_20px_50px_rgba(94,212,255,0.05)]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-5 rounded-md" />
            </div>
            <Skeleton className="h-10 w-36 rounded-lg sm:h-11 sm:w-44" />
            <Skeleton className="h-3 w-28" />
            {i === 1 ? <Skeleton className="mt-1 h-2 w-full rounded-full" /> : null}
            {i === 0 ? (
              <div className="flex h-9 gap-0.5 pt-1">
                {Array.from({ length: 12 }).map((__, j) => (
                  <Skeleton
                    key={j}
                    className={cn(
                      "flex-1 rounded-t-sm",
                      j % 4 === 0 ? "h-[35%]" : j % 4 === 1 ? "h-[55%]" : j % 4 === 2 ? "h-[45%]" : "h-[70%]",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <RecentBookingsSkeleton />

      <section className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <ChartSectionSkeleton />
        <StaffSectionSkeleton />
      </section>
    </div>
  );
}

/** Secondary routes: Bookings, Rooms, CMS, etc. */
export function PlaceholderRouteSkeleton({ title = "Page" }: { title?: string }) {
  return (
    <div className="space-y-6">
      <span className="sr-only">Loading {title}</span>
      <div className="rounded-[2rem] bg-card p-8 shadow-elevation-soft dark:bg-card/95 dark:shadow-[0px_24px_60px_rgba(94,212,255,0.05)] dark:backdrop-blur-xl">
        <Skeleton className="h-7 w-44 rounded-lg" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-[75%] rounded-md" />
        </div>
      </div>
    </div>
  );
}
