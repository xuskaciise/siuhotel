import { z } from 'zod';



/** Walk-in / staff POS: only name and phone. */

export const createWalkInCustomerBodySchema = z.object({

  fullName: z.string().min(1).max(200),

  phoneNumber: z.string().min(3).max(32),

});



/** App registration: email and password required. */

export const registerCustomerBodySchema = z.object({

  fullName: z.string().min(1).max(200),

  phoneNumber: z.string().min(3).max(32),

  email: z.string().email().max(320),

  password: z.string().min(8).max(128),

});



export const updateCustomerBodySchema = z

  .object({

    fullName: z.string().min(1).max(200).optional(),

    phoneNumber: z.string().min(3).max(32).optional(),

    email: z.union([z.string().email().max(320), z.null()]).optional(),

    password: z.string().min(8).max(128).optional(),

    idCard: z.union([z.string().max(64), z.null()]).optional(),

    address: z.union([z.string().max(500), z.null()]).optional(),

  })

  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {

    message: 'At least one field must be provided',

  });



export const customerIdParamsSchema = z.object({

  id: z.string().min(1),

});



export type CreateWalkInCustomerInput = z.infer<typeof createWalkInCustomerBodySchema>;

export type RegisterCustomerInput = z.infer<typeof registerCustomerBodySchema>;

export type UpdateCustomerInput = z.infer<typeof updateCustomerBodySchema>;

