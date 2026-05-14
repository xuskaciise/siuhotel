import { AppError } from '../lib/app-error';
import * as userService from '../modules/user/user.service';

import { getBearerToken, verifyStaffToken } from './jwt-staff';

/**
 * When there are zero users (fresh DB), allow the request without JWT so the first account can be created.
 * After at least one user exists, require a valid staff JWT.
 */
export async function requireStaffJwtIfUsersExist(request: Request): Promise<void> {
  const count = await userService.countUsers();
  if (count === 0) {
    return;
  }
  const token = getBearerToken(request);
  if (token === null) {
    throw new AppError(401, 'UNAUTHORIZED', 'Staff login required');
  }
  try {
    await verifyStaffToken(token);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Staff login required');
  }
}

export async function requireStaffJwt(request: Request): Promise<{ sub: string }> {
  const token = getBearerToken(request);
  if (token === null) {
    throw new AppError(401, 'UNAUTHORIZED', 'Staff login required');
  }
  try {
    return await verifyStaffToken(token);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Staff login required');
  }
}
