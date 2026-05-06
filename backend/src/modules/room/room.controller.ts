import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AppError } from '../../lib/app-error';
import { sendSuccess } from '../../utils/api-response';
import { consumeAllMultipartFiles } from '../../utils/multipart-file';
import * as schemas from './room.schema';
import * as roomService from './room.service';

async function requireJwtStaff(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Staff login required');
  }
}

function staffUserId(request: FastifyRequest): string {
  return (request.user as { sub: string }).sub;
}

export function registerRoomRoutes(app: FastifyInstance): void {
  app.post('/room-types', { preHandler: requireJwtStaff }, async (request, reply) => {
    const body = schemas.createRoomTypeBodySchema.parse(request.body);
    const row = await roomService.createRoomType(body, staffUserId(request));
    sendSuccess(reply, roomService.formatRoomTypeResponse(row), 201);
  });

  app.get('/room-types', async (_request, reply) => {
    const rows = await roomService.listRoomTypes();
    sendSuccess(reply, roomService.formatRoomTypeListResponse(rows));
  });

  app.get('/room-types/:id/storage-keys', async (request, reply) => {
    const { id } = schemas.roomTypeIdParamsSchema.parse(request.params);
    const keys = await roomService.listRoomTypeObjectKeysInStorage(id);
    sendSuccess(reply, { keys });
  });

  app.get('/room-types/:id', async (request, reply) => {
    const { id } = schemas.roomTypeIdParamsSchema.parse(request.params);
    const row = await roomService.getRoomTypeById(id);
    sendSuccess(reply, roomService.formatRoomTypeResponse(row));
  });

  app.put('/room-types/:id', async (request, reply) => {
    const { id } = schemas.roomTypeIdParamsSchema.parse(request.params);
    const body = schemas.updateRoomTypeBodySchema.parse(request.body);
    const row = await roomService.updateRoomType(id, body);
    sendSuccess(reply, roomService.formatRoomTypeResponse(row));
  });

  app.post('/room-types/:id/images', async (request, reply) => {
    const { id } = schemas.roomTypeIdParamsSchema.parse(request.params);
    const files = await consumeAllMultipartFiles(request);
    const data = await roomService.addRoomTypeImages(id, files);
    sendSuccess(reply, data, 201);
  });

  app.delete('/room-types/:id/images', async (request, reply) => {
    const { id } = schemas.roomTypeIdParamsSchema.parse(request.params);
    const body = schemas.removeImageBodySchema.parse(request.body);
    const row = await roomService.removeRoomTypeImage(id, body.objectPath);
    sendSuccess(reply, roomService.formatRoomTypeResponse(row));
  });

  app.post('/rooms', { preHandler: requireJwtStaff }, async (request, reply) => {
    const body = schemas.createRoomBodySchema.parse(request.body);
    const row = await roomService.createRoom(body, staffUserId(request));
    sendSuccess(reply, roomService.formatRoomWithTypeResponse(row), 201);
  });

  app.get('/rooms', async (request, reply) => {
    const query = schemas.listRoomsQuerySchema.parse(request.query);
    const rows = await roomService.listRooms(query);
    sendSuccess(reply, roomService.formatRoomWithTypeListResponse(rows));
  });

  app.get('/rooms/:id/storage-keys', async (request, reply) => {
    const { id } = schemas.roomIdParamsSchema.parse(request.params);
    const keys = await roomService.listRoomObjectKeysInStorage(id);
    sendSuccess(reply, { keys });
  });

  app.get('/rooms/:id', async (request, reply) => {
    const { id } = schemas.roomIdParamsSchema.parse(request.params);
    const row = await roomService.getRoomById(id);
    sendSuccess(reply, roomService.formatRoomWithTypeResponse(row));
  });

  app.put('/rooms/:id', async (request, reply) => {
    const { id } = schemas.roomIdParamsSchema.parse(request.params);
    const body = schemas.updateRoomBodySchema.parse(request.body);
    const row = await roomService.updateRoom(id, body);
    sendSuccess(reply, roomService.formatRoomWithTypeResponse(row));
  });

  app.delete('/rooms/:id', async (request, reply) => {
    const { id } = schemas.roomIdParamsSchema.parse(request.params);
    await roomService.deleteRoom(id);
    sendSuccess(reply, { deleted: true });
  });

  app.post('/rooms/:id/images', async (request, reply) => {
    const { id } = schemas.roomIdParamsSchema.parse(request.params);
    const files = await consumeAllMultipartFiles(request);
    const data = await roomService.addRoomImages(id, files);
    sendSuccess(reply, data, 201);
  });

  app.delete('/rooms/:id/images', async (request, reply) => {
    const { id } = schemas.roomIdParamsSchema.parse(request.params);
    const body = schemas.removeImageBodySchema.parse(request.body);
    const row = await roomService.removeRoomImage(id, body.objectPath);
    sendSuccess(reply, roomService.formatRoomWithTypeResponse(row));
  });
}
