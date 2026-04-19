import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const staff = [
  { name: "Sarah Connor", role: "Front Desk Lead", tone: "bg-[#8EB8FF]" },
  { name: "Michael Ross", role: "Housekeeping", tone: "bg-[#00CCFF]" },
  { name: "Anita Blake", role: "Night Manager", tone: "bg-[#a78bfa]" },
] as const;

export function StaffOnDuty() {
  return (
    <Card
      className={cn(
        "h-full rounded-[2rem] border-0 bg-card shadow-elevation-soft ring-0",
        "dark:bg-card/95 dark:shadow-[0px_24px_60px_rgba(94,212,255,0.05)] dark:backdrop-blur-xl",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-8 pb-2 pt-8">
        <CardTitle className="font-display text-xl font-semibold tracking-tight text-foreground dark:text-white">
          Staff on Duty
        </CardTitle>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-primary dark:bg-[#00CCFF]/15 dark:text-[#9de2ff]">
          Live
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-6 pb-8 sm:px-8">
        <ul className="flex flex-col gap-3">
          {staff.map((s) => (
            <li
              key={s.name}
              className="flex items-center gap-3 rounded-2xl bg-background/40 px-2 py-2.5 ring-0 dark:bg-[#1a2230]/6"
            >
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "size-12 rounded-full shadow-[0px_6px_20px_rgba(19,27,46,0.12)] ring-[3px] ring-card",
                    s.tone,
                  )}
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-[3px] border-card bg-[#66dd8b] shadow-[0_0_10px_rgba(102,221,139,0.6)]"
                  title="Active"
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-semibold text-foreground dark:text-white">
                  {s.name}
                </p>
                <p className="truncate text-[0.8125rem] text-muted-foreground">{s.role}</p>
              </div>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground ring-0 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                aria-label={`More for ${s.name}`}
              >
                <MoreHorizontal className="size-5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
        <Link
          href="/staff"
          className="text-center text-[0.8125rem] font-semibold text-primary underline-offset-4 transition hover:underline dark:text-[#9de2ff]"
        >
          View Full Schedule
        </Link>
      </CardContent>
    </Card>
  );
}
