import { RoomStatus, TransactionStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  totalCustomers: number;
  totalRevenueToday: string;
}

function utcDayBounds(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { start, end } = utcDayBounds();

  const [totalRooms, availableRooms, totalCustomers, agg] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { status: RoomStatus.AVAILABLE } }),
    prisma.customer.count(),
    prisma.transaction.aggregate({
      where: {
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const sum = agg._sum.amount;
  const totalRevenueToday =
    sum !== null && sum !== undefined ? sum.toFixed(2) : '0.00';

  return {
    totalRooms,
    availableRooms,
    totalCustomers,
    totalRevenueToday,
  };
}
