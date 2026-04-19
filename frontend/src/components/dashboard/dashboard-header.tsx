import { Bell, ChevronRight, CircleHelp, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { cn } from "@/lib/utils";

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function DashboardHeader() {
  const dateLine = todayLabel();

  return (
    <header className="space-y-4 pb-1">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[0.8125rem]">
        <nav
          className="font-display flex items-center gap-1.5 font-medium text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <span className="text-foreground/80 dark:text-white/80">Operations</span>
          <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
          <span className="text-primary dark:text-[#9de2ff]">Dashboard</span>
        </nav>
        <time
          className="tabular-nums text-muted-foreground dark:text-[#9aa8bc]"
          dateTime={new Date().toISOString().slice(0, 10)}
        >
          {dateLine}
        </time>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className={cn(
            "flex min-h-[3rem] min-w-0 flex-1 items-center gap-3 rounded-full px-5 py-2.5 ring-0",
            "bg-[#f4f4f7] shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-[rgb(255_255_255/0.06)]",
            "dark:shadow-[0px_8px_28px_rgba(0,0,0,0.2)]",
          )}
        >
          <Search className="size-[1.05rem] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="truncate text-[0.875rem] text-muted-foreground">
            Search reservations, rooms, or guests…
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full ring-0 transition",
              "bg-[#f4f4f7] text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:bg-[#eaeaea]",
              "dark:bg-[rgb(255_255_255/0.08)] dark:text-[#e8f0ff] dark:shadow-none dark:hover:bg-[rgb(255_255_255/0.12)]",
            )}
            aria-label="Notifications"
          >
            <Bell className="size-[1.1rem]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full ring-0 transition",
              "bg-[#f4f4f7] text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06)] hover:bg-[#eaeaea]",
              "dark:bg-[rgb(255_255_255/0.08)] dark:text-[#e8f0ff] dark:shadow-none dark:hover:bg-[rgb(255_255_255/0.12)]",
            )}
            aria-label="Help and support"
          >
            <CircleHelp className="size-[1.1rem]" strokeWidth={1.75} />
          </button>
          <ThemeToggle />
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 ring-0",
              "bg-[#f4f4f7] shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-[rgb(255_255_255/0.08)]",
              "dark:shadow-none",
            )}
          >
            <Avatar className="size-10 ring-0">
              <AvatarFallback className="bg-gradient-to-br from-[#006782] to-[#00CCFF] text-xs font-bold text-white">
                AD
              </AvatarFallback>
            </Avatar>
            <div className="hidden leading-tight sm:block">
              <p className="font-display text-[0.8125rem] font-semibold text-foreground dark:text-white">
                Admin
              </p>
              <p className="text-[0.65rem] font-medium text-muted-foreground dark:text-white/55">
                Profile
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
