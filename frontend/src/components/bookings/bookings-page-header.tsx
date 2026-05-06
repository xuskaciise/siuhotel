import Image from "next/image";

import { cn } from "@/lib/utils";

type BookingsPageHeaderProps = {
  title: string;
  subtitle: string;
};

export function BookingsPageHeader({ title, subtitle }: BookingsPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-muted/40 ring-0 dark:bg-white/[0.06]">
          <Image src="/siulogo.png" alt="SIU" fill className="object-contain p-2" sizes="44px" priority />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">Reservations</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground dark:text-white sm:text-3xl">
            {title}
          </h1>
          <p className={cn("mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground dark:text-[#b4c0cc]")}>
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}
