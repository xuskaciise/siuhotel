import { z } from 'zod';

/** Login accepts any non-empty trimmed string; lookup is case-insensitive on the server. */
export const loginBodySchema = z.object({
  username: z.string().min(1).max(64).transform((s) => s.trim()),
  password: z.string().min(1).max(500),
});

export type LoginBody = z.infer<typeof loginBodySchema>;
