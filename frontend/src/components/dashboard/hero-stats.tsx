import { Clock, DollarSign, DoorOpen, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const spark = [12, 18, 14, 22, 28, 24, 32, 30, 36, 40, 38, 44];

const cards = [
  {
    label: "Total Revenue",
    value: "$142,850.00",
    sub: "~12.5% vs last month",
    subClass: "text-emerald-600 dark:text-[#66dd8b]",
    accent: "var(--accent-line-success)",
    icon: DollarSign,
  },
  {
    label: "Available Rooms",
    value: "42 / 120",
    sub: null,
    bar: true,
    accent: "var(--accent-line-info)",
    icon: DoorOpen,
  },
  {
    label: "Occupied Rooms",
    value: "78",
    sub: "Current Occupancy: 85%",
    subClass: "text-muted-foreground",
    accent: "var(--accent-line-warn)",
    icon: Users,
  },
  {
    label: "Pending Check-ins",
    value: "14",
    sub: "Arriving within next 12h",
    subClass: "text-muted-foreground",
    accent: "var(--accent-line-neutral)",
    icon: Clock,
  },
] as const;

export function HeroStats() {
  return (
    <section className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4 xl:gap-10">
      {cards.map((c) => (
        <Card
          key={c.label}
          className={cn(
            "group relative overflow-hidden rounded-[2rem] border-0 bg-card ring-0",
            "shadow-elevation-soft transition duration-300 dark:bg-card/95 dark:backdrop-blur-xl",
            "hover:-translate-y-1 hover:bg-muted/40 dark:hover:bg-[#242a3a]",
            "dark:shadow-[0px_20px_50px_rgba(94,212,255,0.05)]",
          )}
        >
          <div
            className="pointer-events-none absolute inset-y-6 left-0 w-1 rounded-full opacity-90 shadow-none dark:shadow-[0_0_14px_rgba(94,212,255,0.35)]"
            style={{ backgroundColor: c.accent }}
            aria-hidden
          />
          <CardContent className="relative flex flex-col gap-4 px-6 pb-7 pl-7 pt-7">
            <div className="flex items-start justify-between gap-2">
              <p className="text-label-editorial text-muted-foreground">{c.label}</p>
              <c.icon
                className="size-5 shrink-0 text-muted-foreground/80 opacity-80 transition group-hover:text-primary dark:group-hover:text-[#9de2ff]"
                strokeWidth={1.65}
              />
            </div>
            <p className="font-display text-[2rem] font-bold tracking-[-0.02em] text-foreground sm:text-[2.25rem] dark:text-[#9de2ff]">
              {c.value}
            </p>
            {"sub" in c && c.sub ? (
              <p
                className={cn(
                  "text-[0.8125rem] font-medium",
                  "subClass" in c && c.subClass ? c.subClass : "text-muted-foreground",
                )}
              >
                {c.sub}
              </p>
            ) : null}
            {"bar" in c && c.bar ? (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted dark:bg-[#1a2230]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#006782] to-[#00CCFF]"
                  style={{ width: "35%" }}
                />
              </div>
            ) : null}
            {c.label === "Total Revenue" ? (
              <div className="flex h-9 items-end gap-0.5 pt-1 opacity-80">
                {spark.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[2px] bg-primary/80 dark:bg-[#00CCFF]/90"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
