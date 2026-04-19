import type { FastifyInstance } from 'fastify';

import { sendSuccess } from '../../utils/api-response';

import * as schemas from './user.schema';

import * as userService from './user.service';



export function registerUserRoutes(app: FastifyInstance): void {

  app.post('/users', async (request, reply) => {

    const body = schemas.createUserBodySchema.parse(request.body);

    const row = await userService.createUser(body);

    sendSuccess(reply, row, 201);

  });



  app.get('/users', async (_request, reply) => {

    const rows = await userService.listUsers();

    sendSuccess(reply, rows);

  });

}

