import { z } from 'zod';

/** Must be typed exactly to arm the destructive reset (prevents mis-clicks). */
export const RESET_CONFIRM_PHRASE = 'RESET SIU HOTEL' as const;

export const resetSystemBodySchema = z.object({
  confirmPhrase: z.literal(RESET_CONFIRM_PHRASE),
});

export type ResetSystemBody = z.infer<typeof resetSystemBodySchema>;
