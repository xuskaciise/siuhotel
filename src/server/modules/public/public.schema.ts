import { z } from 'zod';



export const publicRoomsQuerySchema = z.object({

  roomTypeId: z.string().min(1).optional(),

});



export type PublicRoomsQuery = z.infer<typeof publicRoomsQuerySchema>;

