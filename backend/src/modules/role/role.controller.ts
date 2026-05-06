import type { FastifyInstance } from 'fastify';

import { requireStaffJwtIfUsersExist } from '../../plugins/require-staff-if-seeded';
import { sendSuccess } from '../../utils/api-response';

import * as roleService from './role.service';

export function registerRoleRoutes(app: FastifyInstance): void {
  app.get(
    '/roles',
    { preHandler: requireStaffJwtIfUsersExist },
    async (_request, reply) => {
      const rows = await roleService.listRolesWithPermissions();
      sendSuccess(reply, rows);
    },
  );
}

