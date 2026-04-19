import { z } from 'zod';



export const roleIdParamsSchema = z.object({

  id: z.string().min(1),

});



export type RoleIdParams = z.infer<typeof roleIdParamsSchema>;

