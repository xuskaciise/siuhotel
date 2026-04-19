import { RoomsInventoryClient } from "@/components/rooms/rooms-inventory-client";
import { RoomsManagementPageHeader } from "@/components/rooms/rooms-management-page-header";
import {
  fetchRoomTypesFromBackend,
  fetchRoomsFromBackend,
  type RoomTypeDto,
  type RoomWithTypeDto,
} from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

export default async function RoomsPage() {
  let rooms: RoomWithTypeDto[];
  let roomTypes: RoomTypeDto[];
  let loadError: string | null = null;
  try {
    [rooms, roomTypes] = await Promise.all([
      fetchRoomsFromBackend(),
      fetchRoomTypesFromBackend(),
    ]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load room data.";
    rooms = [];
    roomTypes = [];
  }

  return (
    <div
      className={cn(
        "dashboard-canvas flex flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10 sm:py-10 lg:gap-14 lg:px-12 lg:py-12",
        "bg-white dark:bg-[color-mix(in_srgb,var(--card)_55%,transparent)]",
        "dark:backdrop-blur-xl",
      )}
    >
      <RoomsManagementPageHeader
        section="inventory"
        title="Room inventory"
        subtitle="Real-time status of SIU suites and residences — editorial, image-led inventory."
      />
      <RoomsInventoryClient
        initialRooms={rooms}
        initialRoomTypes={roomTypes}
        loadError={loadError}
      />
    </div>
  );
}
