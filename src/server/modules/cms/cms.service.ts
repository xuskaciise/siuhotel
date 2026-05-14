import type { HeroSection, HotelInfo, Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma';

import { AppError } from '../../lib/app-error';

import type { CreateHeroSectionInput, UpdateHeroSectionInput, UpsertHotelInfoInput } from './cms.schema';



const HOTEL_INFO_SINGLETON_ID = 'seed_hotel_info_singleton';



export async function listHeroSections(): Promise<HeroSection[]> {

  return prisma.heroSection.findMany({

    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],

  });

}



export async function createHeroSection(input: CreateHeroSectionInput): Promise<HeroSection> {

  const data: Prisma.HeroSectionCreateInput = {

    imageUrl: input.imageUrl,

    title: input.title,

    isActive: input.isActive ?? true,

    order: input.order ?? 0,

  };

  if (input.subTitle !== undefined) {

    data.subTitle = input.subTitle;

  }

  return prisma.heroSection.create({ data });

}



export async function getHeroSectionById(id: string): Promise<HeroSection> {

  const row = await prisma.heroSection.findUnique({ where: { id } });

  if (row === null) {

    throw new AppError(404, 'HERO_SECTION_NOT_FOUND', 'Hero section not found');

  }

  return row;

}



export async function updateHeroSection(id: string, input: UpdateHeroSectionInput): Promise<HeroSection> {

  await getHeroSectionById(id);

  return prisma.heroSection.update({

    where: { id },

    data: {

      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),

      ...(input.title !== undefined ? { title: input.title } : {}),

      ...(input.subTitle !== undefined ? { subTitle: input.subTitle } : {}),

      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),

      ...(input.order !== undefined ? { order: input.order } : {}),

    },

  });

}



export async function deleteHeroSection(id: string): Promise<void> {

  await getHeroSectionById(id);

  await prisma.heroSection.delete({ where: { id } });

}



export async function getHotelInfo(): Promise<HotelInfo> {

  const row = await prisma.hotelInfo.findFirst({ orderBy: { createdAt: 'asc' } });

  if (row === null) {

    throw new AppError(404, 'HOTEL_INFO_NOT_FOUND', 'Hotel info has not been configured');

  }

  return row;

}



export async function upsertHotelInfo(input: UpsertHotelInfoInput): Promise<HotelInfo> {

  const existing = await prisma.hotelInfo.findUnique({ where: { id: HOTEL_INFO_SINGLETON_ID } });

  if (existing === null) {

    return prisma.hotelInfo.create({

      data: {

        id: HOTEL_INFO_SINGLETON_ID,

        name: input.name,

        address: input.address,

        phone: input.phone,

        email: input.email,

        aboutUs: input.aboutUs,

        logoUrl: input.logoUrl,

      },

    });

  }

  return prisma.hotelInfo.update({

    where: { id: HOTEL_INFO_SINGLETON_ID },

    data: {

      name: input.name,

      address: input.address,

      phone: input.phone,

      email: input.email,

      aboutUs: input.aboutUs,

      logoUrl: input.logoUrl,

    },

  });

}

