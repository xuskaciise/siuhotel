import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DigitalSidebar } from "@/components/dashboard/digital-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DigitalSidebar />
      <div className="mx-auto flex min-h-screen min-w-0 flex-1 max-w-[1720px] flex-col gap-6 bg-background px-4 py-5 sm:gap-8 sm:px-6 sm:py-7 lg:gap-10 lg:px-8">
        <DashboardHeader />
        {children}
      </div>
    </div>
  );
}
