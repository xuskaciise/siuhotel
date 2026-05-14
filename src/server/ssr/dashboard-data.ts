import type {
  BookingDto,
  CustomerDto,
  HotelInfoDto,
  RoomTypeDto,
  RoomWithTypeDto,
  TransactionDto,
} from "@/lib/api/apiService";
import { AppError } from "@/server/lib/app-error";
import * as bookingService from "@/server/modules/booking/booking.service";
import * as cmsService from "@/server/modules/cms/cms.service";
import * as customerService from "@/server/modules/customer/customer.service";
import * as roomService from "@/server/modules/room/room.service";
import * as transactionService from "@/server/modules/transaction/transaction.service";

/** RSC props must be JSON-serializable (Prisma `Date` → ISO strings). */
export function toClientJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function ssrRoomsPageData(): Promise<{
  rooms: RoomWithTypeDto[];
  roomTypes: RoomTypeDto[];
}> {
  const [rows, types] = await Promise.all([roomService.listRooms({}), roomService.listRoomTypes()]);
  return {
    rooms: toClientJson(roomService.formatRoomWithTypeListResponse(rows)) as unknown as RoomWithTypeDto[],
    roomTypes: toClientJson(roomService.formatRoomTypeListResponse(types)) as unknown as RoomTypeDto[],
  };
}

export async function ssrRoomTypesPageData(): Promise<{ roomTypes: RoomTypeDto[] }> {
  const types = await roomService.listRoomTypes();
  return { roomTypes: toClientJson(roomService.formatRoomTypeListResponse(types)) as unknown as RoomTypeDto[] };
}

export async function ssrCustomersPageData(): Promise<{ customers: CustomerDto[] }> {
  const rows = await customerService.listCustomers();
  return { customers: toClientJson(rows) as unknown as CustomerDto[] };
}

export async function ssrBookingsPageData(): Promise<{
  bookings: BookingDto[];
  roomTypes: RoomTypeDto[];
  rooms: RoomWithTypeDto[];
}> {
  const [bookingsRows, types, roomsRows] = await Promise.all([
    bookingService.listBookings(),
    roomService.listRoomTypes(),
    roomService.listRooms({}),
  ]);
  return {
    bookings: toClientJson(bookingService.formatBookingListResponse(bookingsRows)) as unknown as BookingDto[],
    roomTypes: toClientJson(roomService.formatRoomTypeListResponse(types)) as unknown as RoomTypeDto[],
    rooms: toClientJson(roomService.formatRoomWithTypeListResponse(roomsRows)) as unknown as RoomWithTypeDto[],
  };
}

export async function ssrBookingById(
  id: string,
): Promise<{ booking: BookingDto | null; loadError: string | null }> {
  try {
    const row = await bookingService.getBookingById(id);
    return {
      booking: toClientJson(bookingService.formatBookingResponse(row)) as unknown as BookingDto,
      loadError: null as string | null,
    };
  } catch (e) {
    if (e instanceof AppError) {
      return { booking: null, loadError: e.message };
    }
    return {
      booking: null,
      loadError: e instanceof Error ? e.message : "Could not load booking.",
    };
  }
}

export async function ssrTransactionsList(): Promise<TransactionDto[]> {
  const rows = await transactionService.listTransactions();
  return toClientJson(transactionService.formatTransactionListResponse(rows)) as unknown as TransactionDto[];
}

export async function ssrHotelInfoOrNull(): Promise<HotelInfoDto | null> {
  try {
    const row = await cmsService.getHotelInfo();
    return toClientJson(row) as unknown as HotelInfoDto;
  } catch {
    return null;
  }
}
