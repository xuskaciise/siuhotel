import { z } from 'zod';



export const heroSectionIdParamsSchema = z.object({

  id: z.string().min(1),

});



export const createHeroSectionBodySchema = z.object({

  imageUrl: z.string().min(1).max(2048),

  title: z.string().min(1).max(300),

  subTitle: z.string().max(500).optional(),

  isActive: z.boolean().optional(),

  order: z.number().int().optional(),

});



export const updateHeroSectionBodySchema = z

  .object({

    imageUrl: z.string().min(1).max(2048).optional(),

    title: z.string().min(1).max(300).optional(),

    subTitle: z.union([z.string().max(500), z.null()]).optional(),

    isActive: z.boolean().optional(),

    order: z.number().int().optional(),

  })

  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {

    message: 'At least one field must be provided',

  });



export const upsertHotelInfoBodySchema = z.object({

  name: z.string().min(1).max(200),

  address: z.string().min(1).max(500),

  phone: z.string().min(1).max(64),

  email: z.string().email().max(320),

  aboutUs: z.string().min(1).max(20000),

  logoUrl: z.string().max(2048),

});



export type CreateHeroSectionInput = z.infer<typeof createHeroSectionBodySchema>;

export type UpdateHeroSectionInput = z.infer<typeof updateHeroSectionBodySchema>;

export type UpsertHotelInfoInput = z.infer<typeof upsertHotelInfoBodySchema>;

