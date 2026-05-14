"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BedDouble,
  Briefcase,
  CalendarRange,
  Globe,
  LayoutGrid,
  LogOut,
  Settings,
  UserCircle2,
  Users,
} from "lucide-react";

import { useStaffAuth } from "@/components/auth/staff-auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function staffInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  const a = parts[0]![0] ?? "";
  const b = parts[parts.length - 1]![0] ?? "";
  const s = (a + b).toUpperCase();
  return s.length > 0 ? s : "?";
}

const baseNav = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/bookings", label: "Bookings", icon: CalendarRange },
  { href: "/rooms", label: "Room Management", icon: BedDouble },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/staff", label: "Staff", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: UserCircle2 },
  { href: "/cms", label: "Website CMS", icon: Globe },
] as const;

const adminOnlyNav = [
  { href: "/settings", label: "System settings", icon: Settings },
] as const;

export function DigitalSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useStaffAuth();
  const nav = useMemo(() => {
    if (user?.role?.name === "ADMIN") {
      return [...baseNav, ...adminOnlyNav];
    }
    return [...baseNav];
  }, [user?.role?.name]);
  const displayName = user?.fullName ?? "Staff";
  const roleLabel = user?.role?.name?.replace(/_/g, " ") ?? "Staff";
  const handleLine =
    user?.username !== undefined ? `@${user.username} · ${roleLabel}` : roleLabel;

  return (
    <aside
      className={cn(
        "relative flex h-screen min-h-screen w-[17.5rem] shrink-0 flex-col overflow-hidden rounded-none ring-0 print:hidden",
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
                : href === "/bookings"
                  ? pathname === "/bookings" || pathname.startsWith("/bookings/")
                : href === "/rooms"
                  ? pathname === "/rooms" ||
                    pathname.startsWith("/rooms/") ||
                    pathname === "/room-types" ||
                    pathname.startsWith("/room-types/")
                  : href === "/settings"
                    ? pathname === "/settings" || pathname.startsWith("/settings/")
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

        <div className="mt-auto space-y-2 pt-6">
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
                  {staffInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-sm font-semibold text-foreground dark:text-white">{displayName}</p>
                <p className="truncate text-[0.65rem] font-medium tracking-wide text-muted-foreground dark:text-white/55">
                  {handleLine}
                </p>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full rounded-full border-0 bg-white/80 text-xs font-semibold text-foreground shadow-sm hover:bg-muted dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
            onClick={() => {
              logout();
              router.replace("/login");
              router.refresh();
            }}
          >
            <LogOut className="mr-2 size-3.5" strokeWidth={2} />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}
