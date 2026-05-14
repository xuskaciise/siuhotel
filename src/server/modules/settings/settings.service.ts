import { AppError } from '../../lib/app-error';
import { prisma } from '../../lib/prisma';

export async function assertUserIsAdmin(userId: string): Promise<void> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: { select: { name: true } } },
  });
  if (row === null) {
    throw new AppError(401, 'UNAUTHORIZED', 'User not found');
  }
  if (row.role.name !== 'ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only administrators can reset system data');
  }
}

export interface ResetSystemCounts {
  transactions: number;
  bookings: number;
  customers: number;
  rooms: number;
  roomTypes: number;
  heroSections: number;
  hotelInfoRows: number;
  usersDeleted: number;
}

/**
 * Deletes all operational data in FK-safe order. Keeps the acting user row (must be ADMIN).
 * Does not delete MinIO objects or roles/permissions.
 */
export async function resetAllSystemData(actingUserId: string): Promise<ResetSystemCounts> {
  return prisma.$transaction(async (tx) => {
    const transactions = await tx.transaction.deleteMany();
    const bookings = await tx.booking.deleteMany();
    const customers = await tx.customer.deleteMany();
    const rooms = await tx.room.deleteMany();
    const roomTypes = await tx.roomType.deleteMany();
    const heroSections = await tx.heroSection.deleteMany();
    const hotelInfoRows = await tx.hotelInfo.deleteMany();
    const usersDeleted = await tx.user.deleteMany({
      where: { NOT: { id: actingUserId } },
    });
    return {
      transactions: transactions.count,
      bookings: bookings.count,
      customers: customers.count,
      rooms: rooms.count,
      roomTypes: roomTypes.count,
      heroSections: heroSections.count,
      hotelInfoRows: hotelInfoRows.count,
      usersDeleted: usersDeleted.count,
    };
  });
}
