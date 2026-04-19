import type { FastifyInstance } from 'fastify';

import { sendSuccess } from '../../utils/api-response';

import * as schemas from './cms.schema';

import * as cmsService from './cms.service';



export function registerCmsRoutes(app: FastifyInstance): void {

  app.get('/hero-sections', async (_request, reply) => {

    const rows = await cmsService.listHeroSections();

    sendSuccess(reply, rows);

  });



  app.post('/hero-sections', async (request, reply) => {

    const body = schemas.createHeroSectionBodySchema.parse(request.body);

    const row = await cmsService.createHeroSection(body);

    sendSuccess(reply, row, 201);

  });



  app.get('/hero-sections/:id', async (request, reply) => {

    const { id } = schemas.heroSectionIdParamsSchema.parse(request.params);

    const row = await cmsService.getHeroSectionById(id);

    sendSuccess(reply, row);

  });



  app.put('/hero-sections/:id', async (request, reply) => {

    const { id } = schemas.heroSectionIdParamsSchema.parse(request.params);

    const body = schemas.updateHeroSectionBodySchema.parse(request.body);

    const row = await cmsService.updateHeroSection(id, body);

    sendSuccess(reply, row);

  });



  app.delete('/hero-sections/:id', async (request, reply) => {

    const { id } = schemas.heroSectionIdParamsSchema.parse(request.params);

    await cmsService.deleteHeroSection(id);

    sendSuccess(reply, { deleted: true });

  });



  app.get('/hotel-info', async (_request, reply) => {

    const row = await cmsService.getHotelInfo();

    sendSuccess(reply, row);

  });



  app.put('/hotel-info', async (request, reply) => {

    const body = schemas.upsertHotelInfoBodySchema.parse(request.body);

    const row = await cmsService.upsertHotelInfo(body);

    sendSuccess(reply, row);

  });

}

