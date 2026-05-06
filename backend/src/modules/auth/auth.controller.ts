import type { FastifyInstance } from 'fastify';

import { AppError } from '../../lib/app-error';
import { sendSuccess } from '../../utils/api-response';
import * as userService from '../user/user.service';

import { loginBodySchema } from './auth.schema';

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post('/auth/login', async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const user = await userService.verifyStaffLogin(body.username, body.password);
    if (user === null) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }
    const token = await reply.jwtSign({ sub: user.id });
    sendSuccess(reply, { token, user });
  });

  app.get('/auth/me', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or missing session');
    }
    const payload = request.user as { sub: string };
    const user = await userService.getPublicUserById(payload.sub);
    if (user === null) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }
    sendSuccess(reply, user);
  });
}
