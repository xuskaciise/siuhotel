import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type RoomsManagementSection = "inventory" | "categories";

type RoomsManagementPageHeaderProps = {
  section: RoomsManagementSection;
  title: string;
  subtitle: string;
};

const pillBase =
  "rounded-full px-4 py-2 text-[0.8125rem] font-semibold tracking-tight transition-all ring-0";

export function RoomsManagementPageHeader({
  section,
  title,
  subtitle,
}: RoomsManagementPageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <Image
            src="/siulogo.png"
            alt="SIU"
            fill
            className="object-contain object-left dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
            sizes="56px"
            priority
          />
        </div>
        <div className="min-w-0">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-primary dark:text-[#7ed9ff]">
            Room management
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-foreground dark:text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground dark:text-[#b4c0cc]">
            {subtitle}
          </p>
        </div>
      </div>

      <nav
        className={cn(
          "flex shrink-0 gap-1 rounded-full p-1",
          "bg-[#f0f1f5] shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] dark:bg-[rgb(255_255_255/0.06)]",
          "dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
        )}
        aria-label="Room management sections"
      >
        <Link
          href="/rooms"
          className={cn(
            pillBase,
            section === "inventory"
              ? "bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[#0d1322] shadow-[0_8px_28px_rgb(0_204_255/0.35)]"
              : "text-foreground/70 hover:bg-white/80 dark:text-white/65 dark:hover:bg-white/[0.08]",
          )}
        >
          Inventory
        </Link>
        <Link
          href="/room-types"
          className={cn(
            pillBase,
            section === "categories"
              ? "bg-gradient-to-r from-[#00CCFF] to-[#0099FF] text-[#0d1322] shadow-[0_8px_28px_rgb(0_204_255/0.35)]"
              : "text-foreground/70 hover:bg-white/80 dark:text-white/65 dark:hover:bg-white/[0.08]",
          )}
        >
          Room types
        </Link>
      </nav>
    </header>
  );
}
