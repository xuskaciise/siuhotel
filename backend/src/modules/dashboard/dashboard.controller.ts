import type { FastifyInstance } from 'fastify';
import { sendSuccess } from '../../utils/api-response';
import * as dashboardService from './dashboard.service';

export function registerDashboardRoutes(app: FastifyInstance): void {
  app.get('/stats', async (_request, reply) => {
    const data = await dashboardService.getDashboardStats();
    sendSuccess(reply, data);
  });
}
