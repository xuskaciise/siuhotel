import type { FastifyRequest } from 'fastify';

import { AppError } from '../lib/app-error';
import * as userService from '../modules/user/user.service';

/**
 * When there are zero users (fresh DB), allow the request without JWT so the first account can be created.
 * After at least one user exists, require a valid staff JWT.
 */
export async function requireStaffJwtIfUsersExist(request: FastifyRequest): Promise<void> {
  const count = await userService.countUsers();
  if (count === 0) {
    return;
  }
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Staff login required');
  }
}
