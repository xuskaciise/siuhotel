import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { sendSuccess } from '../../utils/api-response';

import * as schemas from './booking.schema';

import * as bookingService from './booking.service';



export function registerBookingRoutes(app: FastifyInstance): void {

  app.post('/bookings', async (request, reply) => {

    const body = schemas.createBookingBodySchema.parse(request.body);

    const row = await bookingService.createBooking(body);

    sendSuccess(reply, bookingService.formatBookingResponse(row), 201);

  });



  app.get('/bookings', async (_request, reply) => {

    const rows = await bookingService.listBookings();

    sendSuccess(reply, bookingService.formatBookingListResponse(rows));

  });



  app.get('/bookings/:id', async (request, reply) => {

    const { id } = schemas.bookingIdParamsSchema.parse(request.params);

    const row = await bookingService.getBookingById(id);

    sendSuccess(reply, bookingService.formatBookingResponse(row));

  });



  const checkout = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {

    const { id } = schemas.bookingIdParamsSchema.parse(request.params);

    const row = await bookingService.checkOutBooking(id);

    sendSuccess(reply, bookingService.formatBookingResponse(row));

  };



  app.post('/bookings/:id/checkout', checkout);

  app.put('/bookings/:id/check-out', checkout);

}

