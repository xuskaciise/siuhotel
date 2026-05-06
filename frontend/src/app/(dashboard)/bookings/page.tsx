import { BookingsListClient } from "@/components/bookings/bookings-list-client";
import { BookingsPageHeader } from "@/components/bookings/bookings-page-header";
import {
  fetchBookingsFromBackend,
  fetchRoomTypesFromBackend,
  fetchRoomsFromBackend,
  type BookingDto,
  type RoomTypeDto,
  type RoomWithTypeDto,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  let bookings: BookingDto[] = [];
  let roomTypes: RoomTypeDto[] = [];
  let rooms: RoomWithTypeDto[] = [];
  let loadError: string | null = null;

  try {
    const [b, t, r] = await Promise.all([
      fetchBookingsFromBackend(),
      fetchRoomTypesFromBackend(),
      fetchRoomsFromBackend(),
    ]);
    bookings = b;
    roomTypes = t;
    rooms = r;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load bookings.";
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
        title="Reservations"
        subtitle="Monitor occupancy, settlement, and guest routing from a single operational surface."
      />
      <BookingsListClient initialBookings={bookings} initialRoomTypes={roomTypes} initialRooms={rooms} loadError={loadError} />
    </div>
  );
}
