import { BookingWizardClient } from "@/components/bookings/booking-wizard-client";
import { BookingsPageHeader } from "@/components/bookings/bookings-page-header";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function NewBookingPage() {
  return (
    <div
      className={cn(
        "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10 sm:py-10 lg:gap-14 lg:px-12 lg:py-12",
        "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)]",
        "dark:backdrop-blur-xl",
      )}
    >
      <BookingsPageHeader
        title="New booking"
        subtitle="Guided flow: choose dates and a free room, attach the guest, then confirm totals and optional payment."
      />
      <BookingWizardClient />
    </div>
  );
}
