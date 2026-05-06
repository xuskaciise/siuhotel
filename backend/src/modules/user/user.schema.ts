import { z } from 'zod';



const usernameField = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/);

export const createUserBodySchema = z.object({
  username: usernameField,
  email: z.string().email().max(320).optional(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(200),
  roleId: z.string().min(1).optional(),
});

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});

const optionalEmailField = z
  .string()
  .email()
  .max(320)
  .or(z.literal(''))
  .or(z.null())
  .optional()
  .transform((s) => {
    if (s === undefined) return undefined;
    if (s === null) return null;
    const t = s.trim();
    return t === '' ? null : t;
  });

export const updateUserBodySchema = z
  .object({
    username: usernameField.optional(),
    email: optionalEmailField,
    fullName: z.string().min(1).max(200).optional(),
    roleId: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    /** Optional new password; when omitted, keep existing password. */
    password: z.string().min(8).max(128).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field is required' });

export type UpdateUserInput = z.infer<typeof updateUserBodySchema>;



export type CreateUserInput = z.infer<typeof createUserBodySchema>;

