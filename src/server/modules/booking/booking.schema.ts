import { z } from 'zod';



export const createBookingBodySchema = z

  .object({

    customerId: z.string().min(1),

    roomId: z.string().min(1),

    createdBy: z.string().min(1).optional(),

    /** @deprecated use createdBy */

    staffId: z.string().min(1).optional(),

    checkIn: z.coerce.date(),

    checkOut: z.coerce.date(),

    totalPrice: z.number().positive().optional(),

    status: z.enum(['PENDING', 'CONFIRMED']).optional(),

  })

  .refine((d) => d.checkOut.getTime() > d.checkIn.getTime(), {

    message: 'checkOut must be after checkIn',

    path: ['checkOut'],

  })

  .transform(({ staffId, createdBy, customerId, roomId, checkIn, checkOut, totalPrice, status }) => ({

    customerId,

    roomId,

    checkIn,

    checkOut,

    totalPrice,

    status,

    createdBy: createdBy ?? staffId,

  }));



export const bookingIdParamsSchema = z.object({

  id: z.string().min(1),

});



export type CreateBookingInput = z.infer<typeof createBookingBodySchema>;

