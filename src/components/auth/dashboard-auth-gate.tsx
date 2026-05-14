"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getStaffToken } from "@/lib/auth/staff-session";

export function DashboardAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = getStaffToken();
    if (!token) {
      const next = pathname && pathname !== "/" ? pathname : "/";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    setAllowed(true);
  }, [router, pathname]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
