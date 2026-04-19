import type { FastifyInstance } from 'fastify';

import { sendSuccess } from '../../utils/api-response';

import * as schemas from './public.schema';

import * as publicService from './public.service';



export function registerPublicRoutes(app: FastifyInstance): void {

  app.get('/public/rooms', async (request, reply) => {

    const query = schemas.publicRoomsQuerySchema.parse(request.query);

    const rows = await publicService.listPublicAvailableRooms(query);

    sendSuccess(reply, rows);

  });



  app.get('/public/hero', async (_request, reply) => {

    const rows = await publicService.listActiveHeroSlides();

    sendSuccess(reply, rows);

  });

}

