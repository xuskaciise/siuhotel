"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  Briefcase,
  CalendarDays,
  Globe,
  LayoutGrid,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/rooms", label: "Room Management", icon: BedDouble },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/staff", label: "Staff", icon: Briefcase },
  { href: "/cms", label: "Website CMS", icon: Globe },
] as const;

export function DigitalSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "relative flex h-screen min-h-screen w-[17.5rem] shrink-0 flex-col overflow-hidden rounded-none ring-0",
        "bg-white shadow-sidebar-light dark:bg-transparent dark:shadow-[6px_0_40px_rgba(0,0,0,0.35)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 hidden bg-[rgb(21_27_43/0.88)] backdrop-blur-[30px] dark:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-white/[0.06] to-transparent dark:block"
        aria-hidden
      />
      <div className="relative z-10 flex h-full flex-col px-4 pb-5 pt-7 text-foreground dark:text-[#e8eef8]">
        <div className="mb-8 flex items-start gap-3 px-1">
          <div className="relative h-12 w-12 shrink-0">
            <Image
              src="/siulogo.png"
              alt="SIU"
              fill
              className="object-contain object-left dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
              sizes="48px"
              priority
            />
          </div>
          <div>
            <p className="font-display text-base font-bold tracking-tight text-foreground dark:text-white">
              SIU Admin
            </p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary dark:text-[#7ed9ff]">
              Luxury Concierge
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/" || pathname === "/dashboard"
                : href === "/rooms"
                  ? pathname === "/rooms" ||
                    pathname.startsWith("/rooms/") ||
                    pathname === "/room-types" ||
                    pathname.startsWith("/room-types/")
                  : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 overflow-hidden rounded-full px-3.5 py-2.5 text-[0.9375rem] font-semibold tracking-tight transition-colors duration-200",
                  active
                    ? "text-white shadow-elevation-soft-md dark:shadow-[0_0_28px_rgba(0,204,255,0.35)]"
                    : "text-foreground/75 hover:bg-muted dark:text-white/65 dark:hover:bg-white/[0.06]",
                )}
              >
                {active ? (
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-[#00CCFF] to-[#0099FF]"
                    aria-hidden
                  />
                ) : null}
                <Icon className="relative z-10 size-[1.15rem] shrink-0" strokeWidth={1.65} />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <div
            className={cn(
              "rounded-2xl px-3 py-3 ring-0",
              "bg-muted shadow-elevation-soft dark:bg-[rgb(0_0_0/0.25)] dark:shadow-none",
              "dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]",
            )}
          >
            <div className="flex items-center gap-3">
              <Avatar className="size-10 ring-0">
                <AvatarFallback className="bg-gradient-to-br from-[#006782] to-[#00CCFF] text-xs font-bold text-white">
                  MC
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-foreground dark:text-white">
                  Marcus Chen
                </p>
                <p className="truncate text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground dark:text-white/55">
                  General Manager
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
