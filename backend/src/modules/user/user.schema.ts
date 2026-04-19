import { z } from 'zod';



export const createUserBodySchema = z.object({

  email: z.string().email().max(320),

  password: z.string().min(8).max(128),

  fullName: z.string().min(1).max(200),

  roleId: z.string().min(1).optional(),

});



export type CreateUserInput = z.infer<typeof createUserBodySchema>;

