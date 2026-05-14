import type { NextRequest } from 'next/server';

import { AppError } from '@/server/lib/app-error';
import { prisma } from '@/server/lib/prisma';
import { loginBodySchema } from '@/server/modules/auth/auth.schema';
import * as bookingSchemas from '@/server/modules/booking/booking.schema';
import * as bookingService from '@/server/modules/booking/booking.service';
import * as cmsSchemas from '@/server/modules/cms/cms.schema';
import * as cmsService from '@/server/modules/cms/cms.service';
import * as customerSchemas from '@/server/modules/customer/customer.schema';
import * as customerImagesSchemas from '@/server/modules/customer/customer-images.schema';
import * as customerImagesService from '@/server/modules/customer/customer-images.service';
import * as customerService from '@/server/modules/customer/customer.service';
import * as dashboardService from '@/server/modules/dashboard/dashboard.service';
import * as publicSchemas from '@/server/modules/public/public.schema';
import * as publicService from '@/server/modules/public/public.service';
import * as roleService from '@/server/modules/role/role.service';
import * as roomSchemas from '@/server/modules/room/room.schema';
import * as roomService from '@/server/modules/room/room.service';
import * as settingsSchemas from '@/server/modules/settings/settings.schema';
import * as settingsService from '@/server/modules/settings/settings.service';
import * as storageSchemas from '@/server/modules/storage/storage.schema';
import * as storageService from '@/server/modules/storage/storage.service';
import * as transactionSchemas from '@/server/modules/transaction/transaction.schema';
import * as transactionService from '@/server/modules/transaction/transaction.service';
import * as userSchemas from '@/server/modules/user/user.schema';
import * as userImagesService from '@/server/modules/user/user-images.service';
import * as userService from '@/server/modules/user/user.service';
import { consumeAllMultipartFiles, consumeFirstMultipartFile } from '@/server/utils/multipart-file';

import { jsonSuccess } from './json-envelope';
import { getBearerToken, signStaffToken, verifyStaffToken } from './jwt-staff';
import { requireStaffJwt, requireStaffJwtIfUsersExist } from './staff-guard';

function searchParamsToQueryObject(sp: URLSearchParams): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of sp) {
    if (!(k in o)) {
      o[k] = v;
    }
  }
  return o;
}

/** Dispatch `/api/...` to former Fastify routes (same paths, methods, and JSON shapes). */
export async function dispatchApiRoute(
  request: NextRequest,
  method: string,
  segments: string[],
): Promise<Response | null> {
  const m = method.toUpperCase();
  const p = segments;
  const n = p.length;
  const url = request.nextUrl;

  if (m === 'POST' && n === 2 && p[0] === 'auth' && p[1] === 'login') {
    const body = loginBodySchema.parse(await request.json());
    const user = await userService.verifyStaffLogin(body.username, body.password);
    if (user === null) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }
    const token = await signStaffToken(user.id);
    return jsonSuccess({ token, user });
  }

  if (m === 'GET' && n === 2 && p[0] === 'auth' && p[1] === 'me') {
    const token = getBearerToken(request);
    if (token === null) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or missing session');
    }
    let sub: string;
    try {
      ({ sub } = await verifyStaffToken(token));
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or missing session');
    }
    const user = await userService.getPublicUserById(sub);
    if (user === null) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }
    return jsonSuccess(user);
  }

  if (m === 'GET' && n === 2 && p[0] === 'setup' && p[1] === 'status') {
    const userCount = await prisma.user.count();
    const needsBootstrap = userCount === 0;
    const roles = needsBootstrap
      ? await prisma.role.findMany({
          select: { id: true, name: true, description: true },
          orderBy: { name: 'asc' },
        })
      : [];
    return jsonSuccess({ needsBootstrap, userCount, roles });
  }

  if (m === 'GET' && n === 1 && p[0] === 'roles') {
    await requireStaffJwtIfUsersExist(request);
    const rows = await roleService.listRolesWithPermissions();
    return jsonSuccess(rows);
  }

  if (m === 'POST' && n === 1 && p[0] === 'users') {
    await requireStaffJwtIfUsersExist(request);
    const body = userSchemas.createUserBodySchema.parse(await request.json());
    const row = await userService.createUser(body);
    return jsonSuccess(row, 201);
  }

  if (m === 'GET' && n === 1 && p[0] === 'users') {
    await requireStaffJwtIfUsersExist(request);
    const rows = await userService.listUsers();
    return jsonSuccess(rows);
  }

  if (m === 'PUT' && n === 2 && p[0] === 'users') {
    await requireStaffJwtIfUsersExist(request);
    const { id } = userSchemas.userIdParamsSchema.parse({ id: p[1] });
    const body = userSchemas.updateUserBodySchema.parse(await request.json());
    const user = await userService.updateUser(id, body);
    return jsonSuccess(user);
  }

  if (m === 'DELETE' && n === 2 && p[0] === 'users') {
    await requireStaffJwtIfUsersExist(request);
    const { id } = userSchemas.userIdParamsSchema.parse({ id: p[1] });
    const result = await userService.deleteUser(id);
    return jsonSuccess(result);
  }

  if (m === 'POST' && n === 3 && p[0] === 'users' && p[2] === 'profile-image') {
    await requireStaffJwtIfUsersExist(request);
    const { id } = userSchemas.userIdParamsSchema.parse({ id: p[1] });
    const file = await consumeFirstMultipartFile(request);
    const result = await userImagesService.uploadUserProfileImage(id, file);
    const user = await userService.getPublicUserById(id);
    if (user === null) {
      return jsonSuccess({ objectPath: result.objectPath }, 201);
    }
    return jsonSuccess(user, 201);
  }

  if (m === 'POST' && n === 1 && p[0] === 'room-types') {
    const staff = await requireStaffJwt(request);
    const body = roomSchemas.createRoomTypeBodySchema.parse(await request.json());
    const row = await roomService.createRoomType(body, staff.sub);
    return jsonSuccess(roomService.formatRoomTypeResponse(row), 201);
  }

  if (m === 'GET' && n === 1 && p[0] === 'room-types') {
    const rows = await roomService.listRoomTypes();
    return jsonSuccess(roomService.formatRoomTypeListResponse(rows));
  }

  if (m === 'GET' && n === 3 && p[0] === 'room-types' && p[2] === 'storage-keys') {
    const { id } = roomSchemas.roomTypeIdParamsSchema.parse({ id: p[1] });
    const keys = await roomService.listRoomTypeObjectKeysInStorage(id);
    return jsonSuccess({ keys });
  }

  if (m === 'GET' && n === 2 && p[0] === 'room-types') {
    const { id } = roomSchemas.roomTypeIdParamsSchema.parse({ id: p[1] });
    const row = await roomService.getRoomTypeById(id);
    return jsonSuccess(roomService.formatRoomTypeResponse(row));
  }

  if (m === 'PUT' && n === 2 && p[0] === 'room-types') {
    const { id } = roomSchemas.roomTypeIdParamsSchema.parse({ id: p[1] });
    const body = roomSchemas.updateRoomTypeBodySchema.parse(await request.json());
    const row = await roomService.updateRoomType(id, body);
    return jsonSuccess(roomService.formatRoomTypeResponse(row));
  }

  if (m === 'POST' && n === 3 && p[0] === 'room-types' && p[2] === 'images') {
    const { id } = roomSchemas.roomTypeIdParamsSchema.parse({ id: p[1] });
    const files = await consumeAllMultipartFiles(request);
    const data = await roomService.addRoomTypeImages(id, files);
    return jsonSuccess(data, 201);
  }

  if (m === 'DELETE' && n === 3 && p[0] === 'room-types' && p[2] === 'images') {
    const { id } = roomSchemas.roomTypeIdParamsSchema.parse({ id: p[1] });
    const body = roomSchemas.removeImageBodySchema.parse(await request.json());
    const row = await roomService.removeRoomTypeImage(id, body.objectPath);
    return jsonSuccess(roomService.formatRoomTypeResponse(row));
  }

  if (m === 'POST' && n === 1 && p[0] === 'rooms') {
    const staff = await requireStaffJwt(request);
    const body = roomSchemas.createRoomBodySchema.parse(await request.json());
    const row = await roomService.createRoom(body, staff.sub);
    return jsonSuccess(roomService.formatRoomWithTypeResponse(row), 201);
  }

  if (m === 'GET' && n === 1 && p[0] === 'rooms') {
    const query = roomSchemas.listRoomsQuerySchema.parse(searchParamsToQueryObject(url.searchParams));
    const rows = await roomService.listRooms(query);
    return jsonSuccess(roomService.formatRoomWithTypeListResponse(rows));
  }

  if (m === 'GET' && n === 3 && p[0] === 'rooms' && p[2] === 'storage-keys') {
    const { id } = roomSchemas.roomIdParamsSchema.parse({ id: p[1] });
    const keys = await roomService.listRoomObjectKeysInStorage(id);
    return jsonSuccess({ keys });
  }

  if (m === 'GET' && n === 2 && p[0] === 'rooms') {
    const { id } = roomSchemas.roomIdParamsSchema.parse({ id: p[1] });
    const row = await roomService.getRoomById(id);
    return jsonSuccess(roomService.formatRoomWithTypeResponse(row));
  }

  if (m === 'PUT' && n === 2 && p[0] === 'rooms') {
    const { id } = roomSchemas.roomIdParamsSchema.parse({ id: p[1] });
    const body = roomSchemas.updateRoomBodySchema.parse(await request.json());
    const row = await roomService.updateRoom(id, body);
    return jsonSuccess(roomService.formatRoomWithTypeResponse(row));
  }

  if (m === 'DELETE' && n === 2 && p[0] === 'rooms') {
    const { id } = roomSchemas.roomIdParamsSchema.parse({ id: p[1] });
    await roomService.deleteRoom(id);
    return jsonSuccess({ deleted: true });
  }

  if (m === 'POST' && n === 3 && p[0] === 'rooms' && p[2] === 'images') {
    const { id } = roomSchemas.roomIdParamsSchema.parse({ id: p[1] });
    const files = await consumeAllMultipartFiles(request);
    const data = await roomService.addRoomImages(id, files);
    return jsonSuccess(data, 201);
  }

  if (m === 'DELETE' && n === 3 && p[0] === 'rooms' && p[2] === 'images') {
    const { id } = roomSchemas.roomIdParamsSchema.parse({ id: p[1] });
    const body = roomSchemas.removeImageBodySchema.parse(await request.json());
    const row = await roomService.removeRoomImage(id, body.objectPath);
    return jsonSuccess(roomService.formatRoomWithTypeResponse(row));
  }

  if (m === 'POST' && n === 1 && p[0] === 'customers') {
    const body = customerSchemas.createWalkInCustomerBodySchema.parse(await request.json());
    const row = await customerService.createWalkInCustomer(body);
    return jsonSuccess(row, 201);
  }

  if (m === 'POST' && n === 2 && p[0] === 'customers' && p[1] === 'register') {
    const body = customerSchemas.registerCustomerBodySchema.parse(await request.json());
    const row = await customerService.registerAppCustomer(body);
    return jsonSuccess(row, 201);
  }

  if (m === 'GET' && n === 1 && p[0] === 'customers') {
    const rows = await customerService.listCustomers();
    return jsonSuccess(rows);
  }

  if (m === 'GET' && n === 3 && p[0] === 'customers' && p[2] === 'storage-keys') {
    const { id } = customerSchemas.customerIdParamsSchema.parse({ id: p[1] });
    const data = await customerImagesService.listCustomerStorageKeys(id);
    return jsonSuccess(data);
  }

  if (m === 'GET' && n === 2 && p[0] === 'customers') {
    const { id } = customerSchemas.customerIdParamsSchema.parse({ id: p[1] });
    const row = await customerService.getCustomerById(id);
    return jsonSuccess(row);
  }

  if (m === 'PUT' && n === 2 && p[0] === 'customers') {
    const { id } = customerSchemas.customerIdParamsSchema.parse({ id: p[1] });
    const body = customerSchemas.updateCustomerBodySchema.parse(await request.json());
    const row = await customerService.updateCustomer(id, body);
    return jsonSuccess(row);
  }

  if (m === 'POST' && n === 3 && p[0] === 'customers' && p[2] === 'images') {
    const { id } = customerSchemas.customerIdParamsSchema.parse({ id: p[1] });
    const files = await consumeAllMultipartFiles(request);
    const objectPaths = await customerImagesService.uploadCustomerImages(id, files);
    return jsonSuccess({ objectPaths }, 201);
  }

  if (m === 'DELETE' && n === 3 && p[0] === 'customers' && p[2] === 'images') {
    const { id } = customerSchemas.customerIdParamsSchema.parse({ id: p[1] });
    const body = customerImagesSchemas.customerImageBodySchema.parse(await request.json());
    const result = await customerImagesService.removeCustomerImage(id, body.objectPath);
    return jsonSuccess(result);
  }

  if (m === 'DELETE' && n === 2 && p[0] === 'customers') {
    const { id } = customerSchemas.customerIdParamsSchema.parse({ id: p[1] });
    await customerService.deleteCustomer(id);
    return jsonSuccess({ deleted: true });
  }

  if (m === 'POST' && n === 1 && p[0] === 'bookings') {
    const body = bookingSchemas.createBookingBodySchema.parse(await request.json());
    const row = await bookingService.createBooking(body);
    return jsonSuccess(bookingService.formatBookingResponse(row), 201);
  }

  if (m === 'GET' && n === 1 && p[0] === 'bookings') {
    const rows = await bookingService.listBookings();
    return jsonSuccess(bookingService.formatBookingListResponse(rows));
  }

  if (m === 'GET' && n === 2 && p[0] === 'bookings') {
    const { id } = bookingSchemas.bookingIdParamsSchema.parse({ id: p[1] });
    const row = await bookingService.getBookingById(id);
    return jsonSuccess(bookingService.formatBookingResponse(row));
  }

  if (
    (m === 'POST' && n === 3 && p[0] === 'bookings' && p[2] === 'checkout') ||
    (m === 'PUT' && n === 3 && p[0] === 'bookings' && p[2] === 'check-out')
  ) {
    const { id } = bookingSchemas.bookingIdParamsSchema.parse({ id: p[1] });
    const row = await bookingService.checkOutBooking(id);
    return jsonSuccess(bookingService.formatBookingResponse(row));
  }

  if (m === 'POST' && n === 1 && p[0] === 'transactions') {
    const body = transactionSchemas.createTransactionBodySchema.parse(await request.json());
    const row = await transactionService.createTransaction(body);
    return jsonSuccess(transactionService.formatTransactionResponse(row), 201);
  }

  if (m === 'GET' && n === 1 && p[0] === 'transactions') {
    const rows = await transactionService.listTransactions();
    return jsonSuccess(transactionService.formatTransactionListResponse(rows));
  }

  if (m === 'GET' && n === 2 && p[0] === 'transactions') {
    const { id } = transactionSchemas.transactionIdParamsSchema.parse({ id: p[1] });
    const row = await transactionService.getTransactionById(id);
    return jsonSuccess(transactionService.formatTransactionResponse(row));
  }

  if (m === 'PUT' && n === 2 && p[0] === 'transactions') {
    const { id } = transactionSchemas.transactionIdParamsSchema.parse({ id: p[1] });
    const body = transactionSchemas.updateTransactionBodySchema.parse(await request.json());
    const row = await transactionService.updateTransaction(id, body);
    return jsonSuccess(transactionService.formatTransactionResponse(row));
  }

  if (m === 'DELETE' && n === 2 && p[0] === 'transactions') {
    const { id } = transactionSchemas.transactionIdParamsSchema.parse({ id: p[1] });
    await transactionService.deleteTransaction(id);
    return jsonSuccess({ deleted: true });
  }

  if (m === 'GET' && n === 1 && p[0] === 'stats') {
    const data = await dashboardService.getDashboardStats();
    return jsonSuccess(data);
  }

  if (m === 'GET' && n === 1 && p[0] === 'hero-sections') {
    const rows = await cmsService.listHeroSections();
    return jsonSuccess(rows);
  }

  if (m === 'POST' && n === 1 && p[0] === 'hero-sections') {
    const body = cmsSchemas.createHeroSectionBodySchema.parse(await request.json());
    const row = await cmsService.createHeroSection(body);
    return jsonSuccess(row, 201);
  }

  if (m === 'GET' && n === 2 && p[0] === 'hero-sections') {
    const { id } = cmsSchemas.heroSectionIdParamsSchema.parse({ id: p[1] });
    const row = await cmsService.getHeroSectionById(id);
    return jsonSuccess(row);
  }

  if (m === 'PUT' && n === 2 && p[0] === 'hero-sections') {
    const { id } = cmsSchemas.heroSectionIdParamsSchema.parse({ id: p[1] });
    const body = cmsSchemas.updateHeroSectionBodySchema.parse(await request.json());
    const row = await cmsService.updateHeroSection(id, body);
    return jsonSuccess(row);
  }

  if (m === 'DELETE' && n === 2 && p[0] === 'hero-sections') {
    const { id } = cmsSchemas.heroSectionIdParamsSchema.parse({ id: p[1] });
    await cmsService.deleteHeroSection(id);
    return jsonSuccess({ deleted: true });
  }

  if (m === 'GET' && n === 1 && p[0] === 'hotel-info') {
    const row = await cmsService.getHotelInfo();
    return jsonSuccess(row);
  }

  if (m === 'PUT' && n === 1 && p[0] === 'hotel-info') {
    const body = cmsSchemas.upsertHotelInfoBodySchema.parse(await request.json());
    const row = await cmsService.upsertHotelInfo(body);
    return jsonSuccess(row);
  }

  if (m === 'GET' && n === 2 && p[0] === 'public' && p[1] === 'rooms') {
    const query = publicSchemas.publicRoomsQuerySchema.parse(searchParamsToQueryObject(url.searchParams));
    const rows = await publicService.listPublicAvailableRooms(query);
    return jsonSuccess(rows);
  }

  if (m === 'GET' && n === 2 && p[0] === 'public' && p[1] === 'hero') {
    const rows = await publicService.listActiveHeroSlides();
    return jsonSuccess(rows);
  }

  if (m === 'POST' && n === 2 && p[0] === 'assets' && p[1] === 'presign') {
    const body = storageSchemas.presignBodySchema.parse(await request.json());
    const data = await storageService.presignGetUrls(body.paths);
    return jsonSuccess(data);
  }

  if (m === 'POST' && n === 2 && p[0] === 'settings' && p[1] === 'reset') {
    const { sub } = await requireStaffJwt(request);
    await settingsService.assertUserIsAdmin(sub);
    settingsSchemas.resetSystemBodySchema.parse(await request.json());
    const deleted = await settingsService.resetAllSystemData(sub);
    const user = await userService.getPublicUserById(sub);
    if (user === null) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Session user missing after reset');
    }
    return jsonSuccess({ deleted, user });
  }

  return null;
}
