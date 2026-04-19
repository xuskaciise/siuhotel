import { Prisma, BookingStatus, RoomStatus, type Booking } from '@prisma/client';

import { prisma } from '../../lib/prisma';

import { AppError } from '../../lib/app-error';

import type { CreateBookingInput } from './booking.schema';



const publicCustomerSelect = {

  id: true,

  fullName: true,

  phoneNumber: true,

  email: true,

  idCard: true,

  address: true,

  createdAt: true,

  updatedAt: true,

} as const;



const publicCreatedBySelect = {

  id: true,

  email: true,

  fullName: true,

  createdAt: true,

  updatedAt: true,

  role: { select: { id: true, name: true } },

} as const;



const bookingInclude = {

  customer: { select: publicCustomerSelect },

  room: { include: { roomType: true } },

  createdBy: { select: publicCreatedBySelect },

} as const;



export type BookingCustomerPublic = Prisma.CustomerGetPayload<{ select: typeof publicCustomerSelect }>;

export type BookingCreatedByPublic = Prisma.UserGetPayload<{ select: typeof publicCreatedBySelect }> | null;



export type BookingWithRelations = Booking & {

  customer: BookingCustomerPublic;

  room: Prisma.RoomGetPayload<{ include: { roomType: true } }>;

  createdBy: BookingCreatedByPublic;

};



export type BookingResponse = Omit<Booking, 'totalPrice'> & {

  totalPrice: string;

  customer: BookingCustomerPublic;

  room: {

    id: string;

    roomNumber: string;

    status: RoomStatus;

    roomTypeId: string;

    images: string[];

    createdAt: Date;

    updatedAt: Date;

    roomType: { id: string; name: string; basePrice: string };

  };

  createdBy: BookingCreatedByPublic;

};



function nightsBetween(checkIn: Date, checkOut: Date): number {

  const ms = checkOut.getTime() - checkIn.getTime();

  const dayMs = 1000 * 60 * 60 * 24;

  return Math.max(1, Math.ceil(ms / dayMs));

}



function formatBooking(row: BookingWithRelations): BookingResponse {

  return {

    id: row.id,

    customerId: row.customerId,

    roomId: row.roomId,

    createdById: row.createdById,

    checkIn: row.checkIn,

    checkOut: row.checkOut,

    totalPrice: row.totalPrice.toFixed(2),

    status: row.status,

    createdAt: row.createdAt,

    updatedAt: row.updatedAt,

    customer: row.customer,

    createdBy: row.createdBy,

    room: {

      id: row.room.id,

      roomNumber: row.room.roomNumber,

      status: row.room.status,

      roomTypeId: row.room.roomTypeId,

      images: row.room.images,

      createdAt: row.room.createdAt,

      updatedAt: row.room.updatedAt,

      roomType: {

        id: row.room.roomType.id,

        name: row.room.roomType.name,

        basePrice: row.room.roomType.basePrice.toFixed(2),

      },

    },

  };

}



export function formatBookingResponse(row: BookingWithRelations): BookingResponse {

  return formatBooking(row);

}



export function formatBookingListResponse(rows: BookingWithRelations[]): BookingResponse[] {

  return rows.map(formatBooking);

}



function overlapFilter(roomId: string, checkIn: Date, checkOut: Date): Prisma.BookingWhereInput {

  return {

    roomId,

    status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },

    AND: [{ checkOut: { gt: checkIn } }, { checkIn: { lt: checkOut } }],

  };

}



function isBookingClosed(status: BookingStatus): boolean {

  return (

    status === BookingStatus.CANCELLED ||

    status === BookingStatus.CHECKED_OUT ||

    status === BookingStatus.COMPLETED

  );

}



export async function createBooking(input: CreateBookingInput): Promise<BookingWithRelations> {

  const status = input.status ?? BookingStatus.CONFIRMED;



  return prisma.$transaction(async (tx) => {

    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });

    if (customer === null) {

      throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');

    }



    if (input.createdBy !== undefined) {

      const creator = await tx.user.findUnique({ where: { id: input.createdBy } });

      if (creator === null) {

        throw new AppError(404, 'STAFF_NOT_FOUND', 'Staff user not found');

      }

    }



    const room = await tx.room.findUnique({

      where: { id: input.roomId },

      include: { roomType: true },

    });

    if (room === null) {

      throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found');

    }



    if (room.status !== RoomStatus.AVAILABLE) {

      throw new AppError(400, 'ROOM_NOT_AVAILABLE', 'Room must be AVAILABLE to create a booking');

    }



    const overlap = await tx.booking.count({

      where: overlapFilter(input.roomId, input.checkIn, input.checkOut),

    });

    if (overlap > 0) {

      throw new AppError(409, 'ROOM_ALREADY_BOOKED', 'This room is already booked for overlapping dates');

    }



    const nights = nightsBetween(input.checkIn, input.checkOut);

    const computedTotal = room.roomType.basePrice.mul(new Prisma.Decimal(nights));

    const totalPrice =

      input.totalPrice !== undefined

        ? new Prisma.Decimal(input.totalPrice)

        : computedTotal;



    const booking = await tx.booking.create({

      data: {

        customerId: input.customerId,

        roomId: input.roomId,

        createdById: input.createdBy ?? null,

        checkIn: input.checkIn,

        checkOut: input.checkOut,

        totalPrice,

        status,

      },

    });



    await tx.room.update({

      where: { id: input.roomId },

      data: { status: RoomStatus.OCCUPIED },

    });



    return tx.booking.findUniqueOrThrow({

      where: { id: booking.id },

      include: bookingInclude,

    });

  });

}



export async function listBookings(): Promise<BookingWithRelations[]> {

  return prisma.booking.findMany({

    include: bookingInclude,

    orderBy: { checkIn: 'desc' },

  });

}



export async function getBookingById(id: string): Promise<BookingWithRelations> {

  const row = await prisma.booking.findUnique({

    where: { id },

    include: bookingInclude,

  });

  if (row === null) {

    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');

  }

  return row;

}



export async function checkOutBooking(bookingId: string): Promise<BookingWithRelations> {

  return prisma.$transaction(async (tx) => {

    const booking = await tx.booking.findUnique({

      where: { id: bookingId },

      include: bookingInclude,

    });

    if (booking === null) {

      throw new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found');

    }

    if (isBookingClosed(booking.status)) {

      throw new AppError(400, 'BOOKING_ALREADY_CLOSED', 'Booking is already checked out or cancelled');

    }



    await tx.booking.update({

      where: { id: bookingId },

      data: { status: BookingStatus.COMPLETED },

    });



    await tx.room.update({

      where: { id: booking.roomId },

      data: { status: RoomStatus.AVAILABLE },

    });



    return tx.booking.findUniqueOrThrow({

      where: { id: bookingId },

      include: bookingInclude,

    });

  });

}

