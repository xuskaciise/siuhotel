import { z } from 'zod';

export const presignBodySchema = z.object({
  paths: z.array(z.string().min(1)).min(1).max(30),
});

export type PresignBody = z.infer<typeof presignBodySchema>;
