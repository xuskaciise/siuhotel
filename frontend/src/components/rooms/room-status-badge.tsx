import type { RoomDisplayStatus } from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

const styles: Record<
  RoomDisplayStatus,
  { label: string; className: string }
> = {
  AVAILABLE: {
    label: "Available",
    className: cn(
      "bg-emerald-500/[0.18] text-emerald-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]",
      "dark:bg-emerald-400/[0.16] dark:text-emerald-50 dark:shadow-none",
    ),
  },
  OCCUPIED: {
    label: "Occupied",
    className: cn(
      "bg-amber-400/[0.35] text-amber-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]",
      "dark:bg-amber-500/[0.22] dark:text-amber-50 dark:shadow-none",
    ),
  },
  CLEANING: {
    label: "Cleaning",
    className: cn(
      "bg-sky-400/[0.22] text-sky-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]",
      "dark:bg-[rgb(0_180_255/0.18)] dark:text-sky-50 dark:shadow-none",
    ),
  },
};

export function RoomStatusBadge({
  status,
  variant = "default",
}: {
  status: RoomDisplayStatus;
  /** High-contrast pill for dark photo overlays. */
  variant?: "default" | "onImage";
}) {
  const cfg = styles[status];
  if (variant === "onImage") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-[0.12em] ring-0",
          "bg-[rgb(255_255_255/0.92)] text-[#0d1322] shadow-[0_4px_20px_rgb(0_0_0/0.15)] backdrop-blur-md",
          "dark:bg-[rgb(255_255_255/0.9)] dark:text-[#0d1322]",
        )}
      >
        {cfg.label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ring-0",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}
