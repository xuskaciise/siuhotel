import type { FastifyInstance } from 'fastify';

import { sendSuccess } from '../../utils/api-response';
import * as schemas from './storage.schema';
import * as storageService from './storage.service';

export function registerStorageRoutes(app: FastifyInstance): void {
  app.post('/assets/presign', async (request, reply) => {
    const body = schemas.presignBodySchema.parse(request.body);
    const data = await storageService.presignGetUrls(body.paths);
    sendSuccess(reply, data);
  });
}
