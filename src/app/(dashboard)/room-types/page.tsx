import { RoomTypesClient } from "@/components/rooms/room-types-client";
import { RoomsManagementPageHeader } from "@/components/rooms/rooms-management-page-header";
import { ssrRoomTypesPageData } from "@/server/ssr/dashboard-data";
import type { RoomTypeDto } from "@/lib/api/apiService";
import { cn } from "@/lib/utils";

export default async function RoomTypesPage() {
  let types: RoomTypeDto[];
  let loadError: string | null = null;
  try {
    const data = await ssrRoomTypesPageData();
    types = data.roomTypes;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load room types.";
    types = [];
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
        section="categories"
        title="Room types"
        subtitle="Categories define pricing and positioning for each tier of the SIU guest experience."
      />
      <RoomTypesClient initialTypes={types} loadError={loadError} />
    </div>
  );
}
