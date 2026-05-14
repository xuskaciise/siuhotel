import { StaffProfileClient } from "@/components/staff/staff-profile-client";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  return (
    <div
      className={cn(
        "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10 sm:py-10 lg:gap-14 lg:px-12 lg:py-12",
        "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)]",
        "dark:backdrop-blur-xl",
      )}
    >
      <StaffProfileClient />
    </div>
  );
}

