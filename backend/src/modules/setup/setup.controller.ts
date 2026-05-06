import type { FastifyInstance } from 'fastify';

import { prisma } from '../../lib/prisma';
import { sendSuccess } from '../../utils/api-response';

export function registerSetupRoutes(app: FastifyInstance): void {
  app.get('/setup/status', async (_request, reply) => {
    const userCount = await prisma.user.count();
    const needsBootstrap = userCount === 0;
    const roles = needsBootstrap
      ? await prisma.role.findMany({
          select: { id: true, name: true, description: true },
          orderBy: { name: 'asc' },
        })
      : [];
    sendSuccess(reply, { needsBootstrap, userCount, roles });
  });
}
