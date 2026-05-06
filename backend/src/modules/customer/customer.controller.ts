import type { FastifyInstance } from 'fastify';

import { sendSuccess } from '../../utils/api-response';

import * as schemas from './customer.schema';

import * as customerService from './customer.service';
import { consumeAllMultipartFiles } from '../../utils/multipart-file';
import * as customerImagesSchemas from './customer-images.schema';
import * as customerImagesService from './customer-images.service';



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

  app.post('/customers/:id/images', async (request, reply) => {
    const { id } = schemas.customerIdParamsSchema.parse(request.params);
    const files = await consumeAllMultipartFiles(request);
    const objectPaths = await customerImagesService.uploadCustomerImages(id, files);
    sendSuccess(reply, { objectPaths }, 201);
  });

  app.delete('/customers/:id/images', async (request, reply) => {
    const { id } = schemas.customerIdParamsSchema.parse(request.params);
    const body = customerImagesSchemas.customerImageBodySchema.parse(request.body);
    const result = await customerImagesService.removeCustomerImage(id, body.objectPath);
    sendSuccess(reply, result);
  });

  app.get('/customers/:id/storage-keys', async (request, reply) => {
    const { id } = schemas.customerIdParamsSchema.parse(request.params);
    const data = await customerImagesService.listCustomerStorageKeys(id);
    sendSuccess(reply, data);
  });



  app.delete('/customers/:id', async (request, reply) => {

    const { id } = schemas.customerIdParamsSchema.parse(request.params);

    await customerService.deleteCustomer(id);

    sendSuccess(reply, { deleted: true });

  });

}

