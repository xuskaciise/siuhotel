import type { FastifyInstance } from 'fastify';

import { sendSuccess } from '../../utils/api-response';

import * as schemas from './customer.schema';

import * as customerService from './customer.service';



export function registerCustomerRoutes(app: FastifyInstance): void {

  app.post('/customers', async (request, reply) => {

    const body = schemas.createWalkInCustomerBodySchema.parse(request.body);

    const row = await customerService.createWalkInCustomer(body);

    sendSuccess(reply, row, 201);

  });



  app.post('/customers/register', async (request, reply) => {

    const body = schemas.registerCustomerBodySchema.parse(request.body);

    const row = await customerService.registerAppCustomer(body);

    sendSuccess(reply, row, 201);

  });



  app.get('/customers', async (_request, reply) => {

    const rows = await customerService.listCustomers();

    sendSuccess(reply, rows);

  });



  app.get('/customers/:id', async (request, reply) => {

    const { id } = schemas.customerIdParamsSchema.parse(request.params);

    const row = await customerService.getCustomerById(id);

    sendSuccess(reply, row);

  });



  app.put('/customers/:id', async (request, reply) => {

    const { id } = schemas.customerIdParamsSchema.parse(request.params);

    const body = schemas.updateCustomerBodySchema.parse(request.body);

    const row = await customerService.updateCustomer(id, body);

    sendSuccess(reply, row);

  });



  app.delete('/customers/:id', async (request, reply) => {

    const { id } = schemas.customerIdParamsSchema.parse(request.params);

    await customerService.deleteCustomer(id);

    sendSuccess(reply, { deleted: true });

  });

}

