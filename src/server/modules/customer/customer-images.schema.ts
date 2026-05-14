import { z } from 'zod';

export const customerImageBodySchema = z.object({
  objectPath: z.string().min(1).max(2048),
});

export type CustomerImageBody = z.infer<typeof customerImageBodySchema>;

