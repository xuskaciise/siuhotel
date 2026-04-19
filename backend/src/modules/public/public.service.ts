import { RoomStatus } from '@prisma/client';

import { prisma } from '../../lib/prisma';

import type { PublicRoomsQuery } from './public.schema';



export type PublicRoomType = {

  id: string;

  name: string;

  description: string | null;

  basePrice: string;

  images: string[];

};



export type PublicRoom = {

  id: string;

  roomNumber: string;

  status: RoomStatus;

  roomType: PublicRoomType;

};



export async function listPublicAvailableRooms(query: PublicRoomsQuery): Promise<PublicRoom[]> {

  const rows = await prisma.room.findMany({

    where: {

      status: RoomStatus.AVAILABLE,

      ...(query.roomTypeId !== undefined ? { roomTypeId: query.roomTypeId } : {}),

    },

    include: { roomType: true },

    orderBy: [{ roomType: { name: 'asc' } }, { roomNumber: 'asc' }],

  });

  return rows.map((r) => ({

    id: r.id,

    roomNumber: r.roomNumber,

    status: r.status,

    roomType: {

      id: r.roomType.id,

      name: r.roomType.name,

      description: r.roomType.description,

      basePrice: r.roomType.basePrice.toFixed(2),

      images: r.roomType.images,

    },

  }));

}



export type PublicHeroSlide = {

  id: string;

  imageUrl: string;

  title: string;

  subTitle: string | null;

  order: number;

};



export async function listActiveHeroSlides(): Promise<PublicHeroSlide[]> {

  const rows = await prisma.heroSection.findMany({

    where: { isActive: true },

    orderBy: { order: 'asc' },

    select: {

      id: true,

      imageUrl: true,

      title: true,

      subTitle: true,

      order: true,

    },

  });

  return rows;

}

