import type { FastifyInstance } from 'fastify';

import { requireStaffJwtIfUsersExist } from '../../plugins/require-staff-if-seeded';
import { sendSuccess } from '../../utils/api-response';
import { consumeFirstMultipartFile } from '../../utils/multipart-file';

import * as schemas from './user.schema';

import * as userService from './user.service';
import * as userImagesService from './user-images.service';

export function registerUserRoutes(app: FastifyInstance): void {
  app.post(
    '/users',
    { preHandler: requireStaffJwtIfUsersExist },
    async (request, reply) => {
      const body = schemas.createUserBodySchema.parse(request.body);
      const row = await userService.createUser(body);
      sendSuccess(reply, row, 201);
    },
  );

  app.get(
    '/users',
    { preHandler: requireStaffJwtIfUsersExist },
    async (_request, reply) => {
      const rows = await userService.listUsers();
      sendSuccess(reply, rows);
    },
  );

  app.put(
    '/users/:id',
    { preHandler: requireStaffJwtIfUsersExist },
    async (request, reply) => {
      const { id } = schemas.userIdParamsSchema.parse(request.params);
      const body = schemas.updateUserBodySchema.parse(request.body);
      const user = await userService.updateUser(id, body);
      sendSuccess(reply, user);
    },
  );

  app.delete(
    '/users/:id',
    { preHandler: requireStaffJwtIfUsersExist },
    async (request, reply) => {
      const { id } = schemas.userIdParamsSchema.parse(request.params);
      const result = await userService.deleteUser(id);
      sendSuccess(reply, result);
    },
  );

  app.post(
    '/users/:id/profile-image',
    { preHandler: requireStaffJwtIfUsersExist },
    async (request, reply) => {
      const { id } = schemas.userIdParamsSchema.parse(request.params);
      const file = await consumeFirstMultipartFile(request);
      const result = await userImagesService.uploadUserProfileImage(id, file);
      const user = await userService.getPublicUserById(id);
      if (user === null) {
        // Extremely unlikely, but keeps response predictable.
        sendSuccess(reply, { objectPath: result.objectPath }, 201);
        return;
      }
      sendSuccess(reply, user, 201);
    },
  );
}

