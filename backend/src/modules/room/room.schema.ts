import { z } from 'zod';

/** Matches Prisma `RoomStatus` — kept in Zod to avoid coupling this file to generated client. */
export const roomStatusEnum = z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']);

export const createRoomTypeBodySchema = z.object({
  name: z.string().min(1).max(200),
  basePrice: z.number().positive().max(99_999_999),
  description: z.string().max(5000).optional(),
  images: z.array(z.string().min(1)).max(100).optional(),
});

export const updateRoomTypeBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    basePrice: z.number().positive().max(99_999_999).optional(),
    description: z.union([z.string().max(5000), z.null()]).optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export const roomTypeIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const removeImageBodySchema = z.object({
  objectPath: z.string().min(1),
});

export const createRoomBodySchema = z.object({
  roomNumber: z.string().min(1).max(64),
  roomTypeId: z.string().min(1),
  status: roomStatusEnum.optional(),
  images: z.array(z.string().min(1)).max(100).optional(),
});

export const updateRoomBodySchema = z
  .object({
    roomNumber: z.string().min(1).max(64).optional(),
    roomTypeId: z.string().min(1).optional(),
    status: roomStatusEnum.optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

function queryEmptyToUndefined(value: unknown): unknown {
  if (value === '' || value === undefined) {
    return undefined;
  }
  return value;
}

function firstQueryValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export const listRoomsQuerySchema = z.object({
  status: z.preprocess(
    (v) => queryEmptyToUndefined(firstQueryValue(v)),
    roomStatusEnum.optional(),
  ),
  roomTypeId: z.preprocess(
    (v) => queryEmptyToUndefined(firstQueryValue(v)),
    z.string().min(1).optional(),
  ),
  checkIn: z.preprocess(
    (v) => queryEmptyToUndefined(firstQueryValue(v)),
    z.coerce.date().optional(),
  ),
  checkOut: z.preprocess(
    (v) => queryEmptyToUndefined(firstQueryValue(v)),
    z.coerce.date().optional(),
  ),
});

export const roomIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeBodySchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeBodySchema>;
export type CreateRoomInput = z.infer<typeof createRoomBodySchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomBodySchema>;
export type ListRoomsQuery = z.infer<typeof listRoomsQuerySchema>;
