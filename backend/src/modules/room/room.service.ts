import { randomUUID } from 'crypto';
import { Prisma, type Room, type RoomType, RoomStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { listObjectKeys, uploadFile, deleteFile } from '../../lib/minio';
import { AppError } from '../../lib/app-error';
import type { MultipartFilePart } from '../../utils/multipart-file';
import type {
  CreateRoomInput,
  CreateRoomTypeInput,
  ListRoomsQuery,
  UpdateRoomInput,
  UpdateRoomTypeInput,
} from './room.schema';

/** All room / room-type image objects must live in this bucket (SRS / product constraint). */
export const HOTEL_POS_ASSETS_BUCKET = 'hotel-pos-assets';

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export type RoomWithType = Room & { roomType: RoomType };

export type RoomTypeResponse = Omit<RoomType, 'basePrice'> & { basePrice: string };

export type RoomWithTypeResponse = Omit<RoomWithType, 'roomType'> & {
  roomType: RoomTypeResponse;
};

function formatRoomType(row: RoomType): RoomTypeResponse {
  return {
    ...row,
    basePrice: row.basePrice.toFixed(2),
  };
}

export function formatRoomTypeResponse(row: RoomType): RoomTypeResponse {
  return formatRoomType(row);
}

export function formatRoomWithTypeResponse(row: RoomWithType): RoomWithTypeResponse {
  const { roomType, ...rest } = row;
  return {
    ...rest,
    roomType: formatRoomType(roomType),
  };
}

export function formatRoomWithTypeListResponse(rows: RoomWithType[]): RoomWithTypeResponse[] {
  return rows.map(formatRoomWithTypeResponse);
}

export function formatRoomTypeListResponse(rows: RoomType[]): RoomTypeResponse[] {
  return rows.map(formatRoomType);
}

function sanitizeFilename(name: string): string {
  const trimmed = name.replace(/[/\\]/g, '_').replace(/\.\./g, '_');
  const cleaned = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
  const sliced = cleaned.slice(0, 128);
  return sliced.length > 0 ? sliced : 'image';
}

function isPrismaKnownError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

function mapRoomStatus(status: CreateRoomInput['status']): RoomStatus {
  if (status === undefined) {
    return RoomStatus.AVAILABLE;
  }
  return status as RoomStatus;
}

function mapRoomStatusOptional(
  status: NonNullable<UpdateRoomInput['status']>,
): RoomStatus {
  return status as RoomStatus;
}

function validateImageMime(contentType: string | undefined): string {
  const mime =
    contentType !== undefined && contentType !== ''
      ? contentType.split(';')[0]?.trim() ?? ''
      : '';
  if (mime === '' || !ALLOWED_IMAGE_MIME.has(mime)) {
    throw new AppError(
      400,
      'INVALID_FILE_TYPE',
      'Only JPEG, PNG, WebP, or GIF images are allowed',
    );
  }
  return mime;
}

// --- Room types ---

export async function createRoomType(input: CreateRoomTypeInput): Promise<RoomType> {
  const data: Prisma.RoomTypeCreateInput = {
    name: input.name,
    basePrice: new Prisma.Decimal(input.basePrice),
    images: input.images ?? [],
  };
  if (input.description !== undefined) {
    data.description = input.description;
  }
  return prisma.roomType.create({ data });
}

export async function listRoomTypes(): Promise<RoomType[]> {
  return prisma.roomType.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getRoomTypeById(id: string): Promise<RoomType> {
  const row = await prisma.roomType.findUnique({ where: { id } });
  if (row === null) {
    throw new AppError(404, 'ROOM_TYPE_NOT_FOUND', 'Room type not found');
  }
  return row;
}

export async function updateRoomType(
  id: string,
  input: UpdateRoomTypeInput,
): Promise<RoomType> {
  await getRoomTypeById(id);
  const data: Prisma.RoomTypeUpdateInput = {};
  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.basePrice !== undefined) {
    data.basePrice = new Prisma.Decimal(input.basePrice);
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  return prisma.roomType.update({
    where: { id },
    data,
  });
}

/**
 * Uploads one or more images to MinIO and appends all object keys to the room type's `images` array in one DB write.
 */
export async function addRoomTypeImages(
  roomTypeId: string,
  files: MultipartFilePart[],
): Promise<{ objectPaths: string[] }> {
  const existing = await getRoomTypeById(roomTypeId);
  const newPaths: string[] = [];

  for (const file of files) {
    const mime = validateImageMime(file.mimetype);
    const objectName = `room-types/${roomTypeId}/${randomUUID()}-${sanitizeFilename(file.filename ?? 'image')}`;
    await uploadFile({
      bucket: HOTEL_POS_ASSETS_BUCKET,
      objectName,
      body: file.buffer,
      contentType: mime,
    });
    newPaths.push(objectName);
  }

  const nextImages = [...existing.images, ...newPaths];
  await prisma.roomType.update({
    where: { id: roomTypeId },
    data: { images: { set: nextImages } },
  });

  return { objectPaths: newPaths };
}

/** Object keys currently stored in MinIO under this room type’s prefix (may include orphans not in DB). */
export async function listRoomTypeObjectKeysInStorage(roomTypeId: string): Promise<string[]> {
  await getRoomTypeById(roomTypeId);
  const prefix = `room-types/${roomTypeId}/`;
  return listObjectKeys({ bucket: HOTEL_POS_ASSETS_BUCKET, prefix, recursive: true });
}

/** Object keys in MinIO under this room’s prefix. */
export async function listRoomObjectKeysInStorage(roomId: string): Promise<string[]> {
  await getRoomById(roomId);
  const prefix = `rooms/${roomId}/`;
  return listObjectKeys({ bucket: HOTEL_POS_ASSETS_BUCKET, prefix, recursive: true });
}

export async function removeRoomTypeImage(
  roomTypeId: string,
  objectPath: string,
): Promise<RoomType> {
  const row = await getRoomTypeById(roomTypeId);
  if (!row.images.includes(objectPath)) {
    throw new AppError(
      400,
      'INVALID_IMAGE_PATH',
      'Object path is not attached to this room type',
    );
  }
  await deleteFile({ bucket: HOTEL_POS_ASSETS_BUCKET, objectPath });
  return prisma.roomType.update({
    where: { id: roomTypeId },
    data: { images: { set: row.images.filter((p) => p !== objectPath) } },
  });
}

// --- Rooms ---

export async function createRoom(input: CreateRoomInput): Promise<RoomWithType> {
  const data: Prisma.RoomUncheckedCreateInput = {
    roomNumber: input.roomNumber,
    roomTypeId: input.roomTypeId,
    status: mapRoomStatus(input.status),
    images: input.images ?? [],
  };
  try {
    return await prisma.room.create({
      data,
      include: { roomType: true },
    });
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === 'P2002') {
      throw new AppError(409, 'ROOM_NUMBER_TAKEN', 'Room number already exists');
    }
    if (isPrismaKnownError(err) && err.code === 'P2003') {
      throw new AppError(400, 'INVALID_ROOM_TYPE', 'Room type does not exist');
    }
    throw err;
  }
}

export async function listRooms(query: ListRoomsQuery): Promise<RoomWithType[]> {
  const where: Prisma.RoomWhereInput = {};
  if (query.status !== undefined) {
    where.status = query.status as RoomStatus;
  }
  if (query.roomTypeId !== undefined) {
    where.roomTypeId = query.roomTypeId;
  }
  return prisma.room.findMany({
    where,
    include: { roomType: true },
    orderBy: { roomNumber: 'asc' },
  });
}

export async function getRoomById(id: string): Promise<RoomWithType> {
  const row = await prisma.room.findUnique({
    where: { id },
    include: { roomType: true },
  });
  if (row === null) {
    throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }
  return row;
}

export async function updateRoom(id: string, input: UpdateRoomInput): Promise<RoomWithType> {
  await getRoomById(id);
  if (input.roomTypeId !== undefined) {
    await getRoomTypeById(input.roomTypeId);
  }
  const data: Prisma.RoomUpdateInput = {};
  if (input.roomNumber !== undefined) {
    data.roomNumber = input.roomNumber;
  }
  if (input.roomTypeId !== undefined) {
    data.roomType = { connect: { id: input.roomTypeId } };
  }
  if (input.status !== undefined) {
    data.status = mapRoomStatusOptional(input.status);
  }
  try {
    return await prisma.room.update({
      where: { id },
      data,
      include: { roomType: true },
    });
  } catch (err) {
    if (isPrismaKnownError(err) && err.code === 'P2002') {
      throw new AppError(409, 'ROOM_NUMBER_TAKEN', 'Room number already exists');
    }
    if (isPrismaKnownError(err) && err.code === 'P2003') {
      throw new AppError(400, 'INVALID_ROOM_TYPE', 'Room type does not exist');
    }
    throw err;
  }
}

/**
 * Uploads one or more images to MinIO and appends all object keys to the room's `images` array in one DB write.
 */
export async function addRoomImages(
  roomId: string,
  files: MultipartFilePart[],
): Promise<{ objectPaths: string[] }> {
  const existing = await getRoomById(roomId);
  const newPaths: string[] = [];

  for (const file of files) {
    const mime = validateImageMime(file.mimetype);
    const objectName = `rooms/${roomId}/${randomUUID()}-${sanitizeFilename(file.filename ?? 'image')}`;
    await uploadFile({
      bucket: HOTEL_POS_ASSETS_BUCKET,
      objectName,
      body: file.buffer,
      contentType: mime,
    });
    newPaths.push(objectName);
  }

  const nextImages = [...existing.images, ...newPaths];
  await prisma.room.update({
    where: { id: roomId },
    data: { images: { set: nextImages } },
  });

  return { objectPaths: newPaths };
}

export async function removeRoomImage(roomId: string, objectPath: string): Promise<RoomWithType> {
  const row = await getRoomById(roomId);
  if (!row.images.includes(objectPath)) {
    throw new AppError(
      400,
      'INVALID_IMAGE_PATH',
      'Object path is not attached to this room',
    );
  }
  await deleteFile({ bucket: HOTEL_POS_ASSETS_BUCKET, objectPath });
  return prisma.room.update({
    where: { id: roomId },
    data: { images: { set: row.images.filter((p) => p !== objectPath) } },
    include: { roomType: true },
  });
}

/**
 * Deletes a room and removes its MinIO prefix objects. Blocked when any booking references the room.
 */
export async function deleteRoom(id: string): Promise<void> {
  const row = await getRoomById(id);
  const bookingCount = await prisma.booking.count({ where: { roomId: id } });
  if (bookingCount > 0) {
    throw new AppError(
      409,
      'ROOM_HAS_BOOKINGS',
      'Cannot delete a room that has bookings; reassign or cancel bookings first.',
    );
  }

  const prefix = `rooms/${id}/`;
  let storageKeys: string[] = [];
  try {
    storageKeys = await listObjectKeys({
      bucket: HOTEL_POS_ASSETS_BUCKET,
      prefix,
      recursive: true,
    });
  } catch {
    /* listing may fail if MinIO is down — still remove DB-listed keys */
  }

  const allKeys = [...new Set([...row.images, ...storageKeys])];
  for (const objectPath of allKeys) {
    try {
      await deleteFile({ bucket: HOTEL_POS_ASSETS_BUCKET, objectPath });
    } catch {
      /* best-effort cleanup */
    }
  }

  await prisma.room.delete({ where: { id } });
}
