import { notFound } from "next/navigation";

import { BookingDetailClient } from "@/components/bookings/booking-detail-client";
import { BookingsPageHeader } from "@/components/bookings/bookings-page-header";
import { fetchBookingFromBackend, type BookingDto } from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingDetailPage(props: PageProps) {
  const { id } = await props.params;
  if (!id?.trim()) notFound();

  let booking: BookingDto | null = null;
  let loadError: string | null = null;
  try {
    booking = await fetchBookingFromBackend(id);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load booking.";
  }

  return (
    <div
      className={cn(
        "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10 sm:py-10 lg:gap-14 lg:px-12 lg:py-12",
        "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)]",
        "dark:backdrop-blur-xl",
      )}
    >
      <BookingsPageHeader
        title="Booking detail"
        subtitle="Reservation record, settlement, and payment history in one place."
      />
      <BookingDetailClient bookingId={id} initialBooking={booking} loadError={loadError} />
    </div>
  );
}
