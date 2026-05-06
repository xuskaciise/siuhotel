import { randomUUID } from 'crypto';
import { Prisma, RoomStatus } from '@prisma/client';
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

const roomCreatorSelect = {
  id: true,
  username: true,
  email: true,
  fullName: true,
} as const;

export type RoomCreatorRow = Prisma.UserGetPayload<{ select: typeof roomCreatorSelect }> | null;

const roomTypeCreatorInclude = {
  createdBy: { select: roomCreatorSelect },
} as const;

export type RoomTypeWithCreator = Prisma.RoomTypeGetPayload<{ include: typeof roomTypeCreatorInclude }>;

const roomWithRelationsInclude = {
  roomType: { include: { createdBy: { select: roomCreatorSelect } } },
  createdBy: { select: roomCreatorSelect },
} as const;

export type RoomWithType = Prisma.RoomGetPayload<{ include: typeof roomWithRelationsInclude }>;

export type RoomCreatorDto = {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
};

export type RoomTypeResponse = {
  id: string;
  name: string;
  basePrice: string;
  description: string | null;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: RoomCreatorDto | null;
};

export type RoomWithTypeResponse = {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  roomTypeId: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  roomType: RoomTypeResponse;
  createdBy: RoomCreatorDto | null;
};

function formatCreator(c: RoomCreatorRow | null | undefined): RoomCreatorDto | null {
  if (c === null || c === undefined) {
    return null;
  }
  return { id: c.id, username: c.username, email: c.email, fullName: c.fullName };
}

function formatRoomType(row: RoomTypeWithCreator): RoomTypeResponse {
  return {
    id: row.id,
    name: row.name,
    basePrice: row.basePrice.toFixed(2),
    description: row.description,
    images: row.images,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: formatCreator(row.createdBy),
  };
}

export function formatRoomTypeResponse(row: RoomTypeWithCreator): RoomTypeResponse {
  return formatRoomType(row);
}

export function formatRoomWithTypeResponse(row: RoomWithType): RoomWithTypeResponse {
  return {
    id: row.id,
    roomNumber: row.roomNumber,
    status: row.status,
    roomTypeId: row.roomTypeId,
    images: row.images,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    roomType: formatRoomType(row.roomType),
    createdBy: formatCreator(row.createdBy),
  };
}

export function formatRoomWithTypeListResponse(rows: RoomWithType[]): RoomWithTypeResponse[] {
  return rows.map(formatRoomWithTypeResponse);
}

export function formatRoomTypeListResponse(rows: RoomTypeWithCreator[]): RoomTypeResponse[] {
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

function mapRoomStatusOptional(status: NonNullable<UpdateRoomInput['status']>): RoomStatus {
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

export async function createRoomType(
  input: CreateRoomTypeInput,
  createdByUserId: string,
): Promise<RoomTypeWithCreator> {
  const data: Prisma.RoomTypeCreateInput = {
    name: input.name,
    basePrice: new Prisma.Decimal(input.basePrice),
    images: input.images ?? [],
    createdBy: { connect: { id: createdByUserId } },
  };
  if (input.description !== undefined) {
    data.description = input.description;
  }
  return prisma.roomType.create({
    data,
    include: roomTypeCreatorInclude,
  });
}

export async function listRoomTypes(): Promise<RoomTypeWithCreator[]> {
  return prisma.roomType.findMany({
    orderBy: { name: 'asc' },
    include: roomTypeCreatorInclude,
  });
}

export async function getRoomTypeById(id: string): Promise<RoomTypeWithCreator> {
  const row = await prisma.roomType.findUnique({
    where: { id },
    include: roomTypeCreatorInclude,
  });
  if (row === null) {
    throw new AppError(404, 'ROOM_TYPE_NOT_FOUND', 'Room type not found');
  }
  return row;
}

export async function updateRoomType(
  id: string,
  input: UpdateRoomTypeInput,
): Promise<RoomTypeWithCreator> {
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
    include: roomTypeCreatorInclude,
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
): Promise<RoomTypeWithCreator> {
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
    include: roomTypeCreatorInclude,
  });
}

// --- Rooms ---

export async function createRoom(
  input: CreateRoomInput,
  createdByUserId: string,
): Promise<RoomWithType> {
  const data: Prisma.RoomUncheckedCreateInput = {
    roomNumber: input.roomNumber,
    roomTypeId: input.roomTypeId,
    status: mapRoomStatus(input.status),
    images: input.images ?? [],
    createdById: createdByUserId,
  };
  try {
    return await prisma.room.create({
      data,
      include: roomWithRelationsInclude,
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
  if (query.checkIn !== undefined || query.checkOut !== undefined) {
    if (query.checkIn === undefined || query.checkOut === undefined) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Provide both checkIn and checkOut to filter unbooked rooms.');
    }
    const checkIn = query.checkIn;
    const checkOut = query.checkOut;
    if (checkOut.getTime() <= checkIn.getTime()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'checkOut must be after checkIn');
    }
    /** Match `createBooking`: only physically available rooms can be booked for these dates. */
    if (query.status === undefined) {
      where.status = RoomStatus.AVAILABLE;
    }
    where.bookings = {
      none: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ checkOut: { gt: checkIn } }, { checkIn: { lt: checkOut } }],
      },
    };
  }
  return prisma.room.findMany({
    where,
    include: roomWithRelationsInclude,
    orderBy: { roomNumber: 'asc' },
  });
}

export async function getRoomById(id: string): Promise<RoomWithType> {
  const row = await prisma.room.findUnique({
    where: { id },
    include: roomWithRelationsInclude,
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
      include: roomWithRelationsInclude,
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
    include: roomWithRelationsInclude,
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
