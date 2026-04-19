import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";

import { RecentBookingsSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HeroStats } from "@/components/dashboard/hero-stats";
import { OccupancyTrendsChart } from "@/components/dashboard/occupancy-trends-chart";
import { RecentBookingsTable } from "@/components/dashboard/recent-bookings-table";
import { StaffOnDuty } from "@/components/dashboard/staff-on-duty";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <div
      className={cn(
        "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10 sm:py-10 lg:gap-14 lg:px-12 lg:py-12",
        "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)]",
        "dark:backdrop-blur-xl",
      )}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground dark:text-white sm:text-4xl">
            Dashboard Overview
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground dark:text-[#bbc8d0]">
            Welcome back, Marcus. Here&apos;s what&apos;s happening at SIU Luxury Suites today.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 rounded-full border-0 bg-transparent px-6 text-[0.8125rem] font-semibold shadow-[inset_0_0_0_1px_rgb(15_23_42/0.12)]",
              "text-foreground hover:bg-muted dark:text-white dark:shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.12)] dark:hover:bg-white/[0.06]",
            )}
          >
            <Download className="mr-2 size-4" strokeWidth={1.75} />
            Export Report
          </button>
          <Link
            href="/bookings"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-11 rounded-full border-0 bg-gradient-to-r from-[#00CCFF] to-[#0099FF] px-7 text-[0.8125rem] font-semibold text-[#0d1322]",
              "shadow-elevation-soft-md ring-0 hover:from-[#33d6ff] hover:to-[#00b4ea] dark:shadow-[0_0_36px_rgba(0,204,255,0.45)]",
            )}
          >
            + New Booking
          </Link>
        </div>
      </div>

      <HeroStats />

      <Suspense fallback={<RecentBookingsSkeleton />}>
        <RecentBookingsTable />
      </Suspense>

      <section className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="min-h-[360px] min-w-0">
          <div
            className={cn(
              "h-full rounded-3xl bg-card p-6 shadow-elevation-soft ring-0 sm:p-8",
              "dark:bg-card/90 dark:shadow-[0px_24px_60px_rgba(94,212,255,0.05)] dark:backdrop-blur-xl",
            )}
          >
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground dark:text-white">
              Occupancy Trends
            </h2>
            <div className="mt-4 min-h-[300px] min-w-0">
              <OccupancyTrendsChart />
            </div>
          </div>
        </div>
        <div className="min-h-[360px]">
          <StaffOnDuty />
        </div>
      </section>
    </div>
  );
}
