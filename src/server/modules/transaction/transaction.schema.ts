import { z } from 'zod';

export const paymentMethodSchema = z.enum(['CASH', 'EVC_PLUS', 'PREMIER_BANK', 'SAHAL']);

export const transactionStatusSchema = z.enum(['COMPLETED', 'REFUNDED']);

export const createTransactionBodySchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: paymentMethodSchema,
  status: transactionStatusSchema.optional(),
});

export const updateTransactionBodySchema = z
  .object({
    amount: z.number().positive().optional(),
    paymentMethod: paymentMethodSchema.optional(),
    status: transactionStatusSchema.optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

export const transactionIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateTransactionInput = z.infer<typeof createTransactionBodySchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionBodySchema>;
