/**
 * REST client for the Fastify backend (`AI_RULES.md.txt`).
 * Development: backend defaults to `http://localhost:3000` with routes at `/bookings`, etc. (no `/api` prefix on the server).
 * The Next.js app rewrites `/api/*` → backend `/*` so browser calls stay same-origin.
 */

import { getStaffAuthHeaders } from "@/lib/auth/staff-session";

const DEFAULT_BACKEND = "http://localhost:3000";

export function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    DEFAULT_BACKEND
  ).replace(/\/$/, "");
}

/** Browser-safe path proxied by `next.config.ts` rewrites. */
export function clientProxyPath(apiPath: string): string {
  const p = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  return `/api${p}`;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_OUT"
  | "COMPLETED"
  | "CANCELLED";

export interface BookingCustomerDto {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  idCard: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRoomDto {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  roomTypeId: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  roomType: { id: string; name: string; basePrice: string };
}

export interface BookingDto {
  id: string;
  customerId: string;
  roomId: string;
  createdById: string | null;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomerDto;
  room: BookingRoomDto;
  createdBy: unknown;
}

/** Public CMS row from `GET /hotel-info` (matches Prisma `HotelInfo`). */
export interface HotelInfoDto {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  aboutUs: string;
  logoUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionStatus = "COMPLETED" | "REFUNDED";

export type PaymentMethod = "CASH" | "EVC_PLUS" | "PREMIER_BANK" | "SAHAL";

export interface TransactionDto {
  id: string;
  bookingId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export type CreateTransactionPayload = {
  bookingId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status?: TransactionStatus;
};

export interface CustomerDto {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  passwordHash?: never;
  idCard: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RoomDisplayStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING";

export function mapRoomStatusToDisplay(status: RoomStatus): RoomDisplayStatus {
  if (status === "MAINTENANCE") return "CLEANING";
  return status;
}

/** Staff user returned from `POST /auth/login` / `GET /auth/me` (password never included). */
export interface StaffUserDto {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  profileImage: string | null;
  isActive: boolean;
  role: {
    id: string;
    name: string;
    description: string | null;
    permissions: { id: string; code: string; description: string | null }[];
  };
  createdAt: string;
  updatedAt: string;
}

/** User who created a room type or physical room (`created_by` in DB). */
export interface RoomCreatorDto {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
}

/** Room category — matches Prisma `RoomType` (API exposes `basePrice` as a decimal string). */
export interface RoomTypeDto {
  id: string;
  name: string;
  basePrice: string;
  description: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: RoomCreatorDto | null;
}

/** Physical room with nested type — matches backend `formatRoomWithTypeResponse`. */
export interface RoomWithTypeDto {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  roomTypeId: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  roomType: RoomTypeDto;
  createdBy: RoomCreatorDto | null;
}

export interface ListRoomsQueryParams {
  status?: RoomStatus;
  roomTypeId?: string;
  checkIn?: string;
  checkOut?: string;
}

export type CreateRoomTypePayload = {
  name: string;
  basePrice: number;
  description?: string;
};

export type UpdateRoomTypePayload = {
  name?: string;
  basePrice?: number;
  description?: string | null;
};

export type CreateRoomPayload = {
  roomNumber: string;
  roomTypeId: string;
  status?: RoomStatus;
};

/** At least one field required by API (`updateRoomBodySchema`). */
export type UpdateRoomPayload = {
  roomNumber?: string;
  roomTypeId?: string;
  status?: RoomStatus;
};

export type CreateWalkInCustomerPayload = {
  fullName: string;
  phoneNumber: string;
};

export type UpdateCustomerPayload = {
  fullName?: string;
  phoneNumber?: string;
  email?: string | null;
  idCard?: string | null;
  address?: string | null;
};

export type CreateBookingPayload = {
  customerId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  totalPrice?: number;
  status?: Extract<BookingStatus, "PENDING" | "CONFIRMED">;
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error("Empty response body");
  }
  return JSON.parse(text) as T;
}

async function readSuccess<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} failed (${res.status})`);
  }
  if (parsed === null || typeof parsed !== "object" || !("success" in parsed)) {
    throw new Error(`${label} failed (${res.status})`);
  }
  const body = parsed as ApiSuccessEnvelope<T> | ApiErrorEnvelope;
  if (!body.success) {
    throw new Error(body.error.message);
  }
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status})`);
  }
  return body.data;
}

/** Staff login — browser only (uses `/api` rewrite). */
export async function loginStaffClient(
  username: string,
  password: string,
): Promise<{ token: string; user: StaffUserDto }> {
  const res = await fetch(clientProxyPath("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return readSuccess<{ token: string; user: StaffUserDto }>(res, "Login");
}

/** Validate JWT and return current staff profile. */
export async function fetchStaffMeClient(): Promise<StaffUserDto> {
  const res = await fetch(clientProxyPath("/auth/me"), {
    cache: "no-store",
    headers: { ...getStaffAuthHeaders() },
  });
  return readSuccess<StaffUserDto>(res, "Session");
}

/** First-run: no auth. After users exist, same shape but `needsBootstrap` is false. */
export interface SetupRoleOptionDto {
  id: string;
  name: string;
  description: string | null;
}

export interface SetupStatusDto {
  needsBootstrap: boolean;
  userCount: number;
  roles: SetupRoleOptionDto[];
}

export async function fetchSetupStatusClient(): Promise<SetupStatusDto> {
  const res = await fetch(clientProxyPath("/setup/status"), { cache: "no-store" });
  return readSuccess<SetupStatusDto>(res, "Setup status");
}

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  permissions: { id: string; code: string; description: string | null }[];
}

export async function fetchRolesClient(): Promise<RoleDto[]> {
  const res = await fetch(clientProxyPath("/roles"), {
    cache: "no-store",
    headers: { ...getStaffAuthHeaders() },
  });
  return readSuccess<RoleDto[]>(res, "Roles");
}

export async function fetchUsersClient(): Promise<StaffUserDto[]> {
  const res = await fetch(clientProxyPath("/users"), {
    cache: "no-store",
    headers: { ...getStaffAuthHeaders() },
  });
  return readSuccess<StaffUserDto[]>(res, "Users");
}

export type CreateStaffUserPayload = {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  roleId?: string;
};

export async function createUserClient(body: CreateStaffUserPayload): Promise<StaffUserDto> {
  const payload: Record<string, unknown> = {
    username: body.username.trim().toLowerCase(),
    password: body.password,
    fullName: body.fullName.trim(),
  };
  if (body.email !== undefined && body.email.trim() !== "") {
    payload.email = body.email.trim().toLowerCase();
  }
  if (body.roleId !== undefined && body.roleId !== "") {
    payload.roleId = body.roleId;
  }
  const res = await fetch(clientProxyPath("/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return readSuccess<StaffUserDto>(res, "Create user");
}

export type UpdateStaffUserPayload = {
  username?: string;
  fullName?: string;
  email?: string | null;
  roleId?: string;
  isActive?: boolean;
  /** Optional new password; omit to keep unchanged. */
  password?: string;
};

export async function updateUserClient(id: string, body: UpdateStaffUserPayload): Promise<StaffUserDto> {
  const payload: Record<string, unknown> = {};
  if (body.username !== undefined) payload.username = body.username.trim().toLowerCase();
  if (body.fullName !== undefined) payload.fullName = body.fullName.trim();
  if (body.email !== undefined) payload.email = body.email === null ? null : body.email.trim().toLowerCase();
  if (body.roleId !== undefined && body.roleId !== "") payload.roleId = body.roleId;
  if (body.isActive !== undefined) payload.isActive = body.isActive;
  if (body.password !== undefined && body.password !== "") payload.password = body.password;
  const res = await fetch(clientProxyPath(`/users/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return readSuccess<StaffUserDto>(res, "Update user");
}

export async function deleteUserClient(id: string): Promise<{ deleted: boolean }> {
  const res = await fetch(clientProxyPath(`/users/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: { ...getStaffAuthHeaders() },
  });
  return readSuccess<{ deleted: boolean }>(res, "Delete user");
}

function roomsListQueryString(query?: ListRoomsQueryParams): string {
  const qs = new URLSearchParams();
  if (query?.status) qs.set("status", query.status);
  if (query?.roomTypeId) qs.set("roomTypeId", query.roomTypeId);
  if (query?.checkIn) qs.set("checkIn", query.checkIn);
  if (query?.checkOut) qs.set("checkOut", query.checkOut);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Server-side: list room types (direct to Fastify).
 */
export async function fetchRoomTypesFromBackend(): Promise<RoomTypeDto[]> {
  const url = `${getBackendBaseUrl()}/room-types`;
  const res = await fetch(url, { cache: "no-store" });
  return readSuccess<RoomTypeDto[]>(res, "Room types request");
}

/**
 * Server-side: list rooms with optional filters (`status`, `roomTypeId`).
 */
export async function fetchRoomsFromBackend(
  query?: ListRoomsQueryParams,
): Promise<RoomWithTypeDto[]> {
  const url = `${getBackendBaseUrl()}/rooms${roomsListQueryString(query)}`;
  const res = await fetch(url, { cache: "no-store" });
  return readSuccess<RoomWithTypeDto[]>(res, "Rooms request");
}

/** Browser: list rooms via Next `/api` rewrite. */
export async function fetchRoomsClient(query?: ListRoomsQueryParams): Promise<RoomWithTypeDto[]> {
  const url = `${clientProxyPath("/rooms")}${roomsListQueryString(query)}`;
  const res = await fetch(url, { cache: "no-store", headers: { ...getStaffAuthHeaders() } });
  return readSuccess<RoomWithTypeDto[]>(res, "Rooms request");
}

/** Browser: single room (`GET /rooms/:id`) — use before booking to re-check status. */
export async function fetchRoomClient(id: string): Promise<RoomWithTypeDto> {
  const res = await fetch(clientProxyPath(`/rooms/${encodeURIComponent(id)}`), {
    cache: "no-store",
    headers: { ...getStaffAuthHeaders() },
  });
  return readSuccess<RoomWithTypeDto>(res, "Room request");
}

/** Browser: list bookings via Next `/api` rewrite. */
export async function fetchBookingsClient(): Promise<BookingDto[]> {
  const res = await fetch(clientProxyPath("/bookings"), { cache: "no-store", headers: { ...getStaffAuthHeaders() } });
  return readSuccess<BookingDto[]>(res, "Bookings request");
}

/** Browser: get one booking (`GET /bookings/:id`). */
export async function fetchBookingClient(id: string): Promise<BookingDto> {
  const res = await fetch(clientProxyPath(`/bookings/${encodeURIComponent(id)}`), {
    cache: "no-store",
    headers: { ...getStaffAuthHeaders() },
  });
  return readSuccess<BookingDto>(res, "Booking request");
}

/** Browser: list transactions (`GET /transactions`). */
export async function fetchTransactionsClient(): Promise<TransactionDto[]> {
  const res = await fetch(clientProxyPath("/transactions"), { cache: "no-store", headers: { ...getStaffAuthHeaders() } });
  return readSuccess<TransactionDto[]>(res, "Transactions request");
}

/** Browser: record a payment against a booking (`POST /transactions`). */
export async function createTransactionClient(body: CreateTransactionPayload): Promise<TransactionDto> {
  const res = await fetch(clientProxyPath("/transactions"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify(body),
  });
  return readSuccess<TransactionDto>(res, "Create transaction");
}

/** Browser: checkout booking (`POST /bookings/:id/checkout`). */
export async function checkoutBookingClient(id: string): Promise<BookingDto> {
  const res = await fetch(clientProxyPath(`/bookings/${id}/checkout`), {
    method: "POST",
    headers: { ...getStaffAuthHeaders() },
  });
  return readSuccess<BookingDto>(res, "Checkout booking");
}

/** Browser: create booking (`POST /bookings`). */
export async function createBookingClient(body: CreateBookingPayload): Promise<BookingDto> {
  const res = await fetch(clientProxyPath("/bookings"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify(body),
  });
  return readSuccess<BookingDto>(res, "Create booking");
}

/** Browser: list customers (`GET /customers`). */
export async function fetchCustomersClient(): Promise<CustomerDto[]> {
  const res = await fetch(clientProxyPath("/customers"), { cache: "no-store", headers: { ...getStaffAuthHeaders() } });
  return readSuccess<CustomerDto[]>(res, "Customers request");
}

/** Browser: create walk-in customer (`POST /customers`). */
export async function createWalkInCustomerClient(body: CreateWalkInCustomerPayload): Promise<CustomerDto> {
  const res = await fetch(clientProxyPath("/customers"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify(body),
  });
  return readSuccess<CustomerDto>(res, "Create customer");
}

/** Browser: update customer (`PUT /customers/:id`). */
export async function updateCustomerClient(id: string, body: UpdateCustomerPayload): Promise<CustomerDto> {
  const res = await fetch(clientProxyPath(`/customers/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify(body),
  });
  return readSuccess<CustomerDto>(res, "Update customer");
}

export async function deleteCustomerClient(id: string): Promise<void> {
  const res = await fetch(clientProxyPath(`/customers/${id}`), {
    method: "DELETE",
    headers: { ...getStaffAuthHeaders() },
  });
  await readSuccess<{ deleted: boolean }>(res, "Delete customer");
}

/** Multipart upload: repeat field name `file` (matches backend `consumeAllMultipartFiles`). */
export async function uploadCustomerImagesClient(
  customerId: string,
  files: File[],
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<UploadImagesResponse> {
  const fd = new FormData();
  for (const f of files) fd.append("file", f);
  const res = await postFormDataWithProgress(
    clientProxyPath(`/customers/${customerId}/images`),
    fd,
    getStaffAuthHeaders(),
    onProgress,
  );
  return readSuccess<UploadImagesResponse>(res, "Upload customer images");
}

export async function removeCustomerImageClient(
  customerId: string,
  objectPath: string,
): Promise<{ deleted: boolean }> {
  const res = await fetch(clientProxyPath(`/customers/${customerId}/images`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify({ objectPath }),
  });
  return readSuccess<{ deleted: boolean }>(res, "Remove customer image");
}

export async function listCustomerStorageKeysClient(customerId: string): Promise<string[]> {
  const res = await fetch(clientProxyPath(`/customers/${customerId}/storage-keys`), {
    cache: "no-store",
    headers: { ...getStaffAuthHeaders() },
  });
  const data = await readSuccess<{ keys: string[] }>(res, "List customer storage keys");
  return data.keys;
}

/** Browser: list room types via Next `/api` rewrite. */
export async function fetchRoomTypesClient(): Promise<RoomTypeDto[]> {
  const res = await fetch(clientProxyPath("/room-types"), { cache: "no-store" });
  return readSuccess<RoomTypeDto[]>(res, "Room types request");
}

/** Browser: create room type (`POST /room-types`). */
export async function createRoomTypeClient(body: CreateRoomTypePayload): Promise<RoomTypeDto> {
  const res = await fetch(clientProxyPath("/room-types"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify(body),
  });
  return readSuccess<RoomTypeDto>(res, "Create room type");
}

/** Browser: update room type (`PUT /room-types/:id`). */
export async function updateRoomTypeClient(
  id: string,
  body: UpdateRoomTypePayload,
): Promise<RoomTypeDto> {
  const res = await fetch(clientProxyPath(`/room-types/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readSuccess<RoomTypeDto>(res, "Update room type");
}

/** Browser: create room (`POST /rooms`). */
export async function createRoomClient(body: CreateRoomPayload): Promise<RoomWithTypeDto> {
  const res = await fetch(clientProxyPath("/rooms"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
    body: JSON.stringify(body),
  });
  return readSuccess<RoomWithTypeDto>(res, "Create room");
}

export async function updateRoomClient(
  id: string,
  body: UpdateRoomPayload,
): Promise<RoomWithTypeDto> {
  const res = await fetch(clientProxyPath(`/rooms/${id}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readSuccess<RoomWithTypeDto>(res, "Update room");
}

export async function deleteRoomClient(id: string): Promise<void> {
  const res = await fetch(clientProxyPath(`/rooms/${id}`), { method: "DELETE" });
  await readSuccess<{ deleted: boolean }>(res, "Delete room");
}

/** Response shape from `POST .../images` (MinIO object keys appended in DB). */
export type UploadImagesResponse = { objectPaths: string[] };

/** Fired while the request body is uploading (XHR `upload.onprogress`). */
export type UploadProgressEvent = {
  loaded: number;
  total: number;
  /** 0–100 when `lengthComputable`; otherwise 0 (show `loaded` bytes in UI). */
  percent: number;
  lengthComputable: boolean;
};

async function postFormDataWithProgress(
  path: string,
  formData: FormData,
  headers?: Record<string, string>,
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<Response> {
  const url = path.startsWith("/") ? path : `/${path}`;
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (v) xhr.setRequestHeader(k, v);
      }
    }
    xhr.upload.onprogress = (evt) => {
      if (!onProgress) return;
      if (evt.lengthComputable && evt.total > 0) {
        const percent = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
        onProgress({
          loaded: evt.loaded,
          total: evt.total,
          percent,
          lengthComputable: true,
        });
      } else {
        onProgress({
          loaded: evt.loaded,
          total: evt.total,
          percent: 0,
          lengthComputable: false,
        });
      }
    };
    xhr.upload.onloadstart = () => {
      onProgress?.({
        loaded: 0,
        total: 0,
        percent: 0,
        lengthComputable: false,
      });
    };
    xhr.upload.onloadend = () => {
      // Some browsers/network stacks do not emit a final 100% `progress` event.
      // Force a terminal update so UIs can reliably show completion.
      onProgress?.({
        loaded: 0,
        total: 0,
        percent: 100,
        lengthComputable: true,
      });
    };
    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        }),
      );
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(formData);
  });
}

/**
 * Presign MinIO GET URLs for object keys (see backend `POST /assets/presign`).
 * Use for thumbnails only; URLs expire per `MINIO_PRESIGNED_EXPIRY_SECONDS`.
 */
export async function presignAssetUrlsClient(
  paths: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths)].slice(0, 30);
  if (unique.length === 0) return {};
  const res = await fetch(clientProxyPath("/assets/presign"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths: unique }),
  });
  return readSuccess<Record<string, string>>(res, "Presign assets");
}

/** Multipart upload: repeat field name `file` (matches backend `consumeFirstMultipartFile`). */
export async function uploadUserProfileImageClient(
  userId: string,
  file: File,
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<StaffUserDto> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await postFormDataWithProgress(
    clientProxyPath(`/users/${encodeURIComponent(userId)}/profile-image`),
    fd,
    getStaffAuthHeaders(),
    onProgress,
  );
  return readSuccess<StaffUserDto>(res, "Upload profile image");
}

/** Multipart upload: repeat field name `file` (matches backend `consumeAllMultipartFiles`). */
export async function uploadRoomTypeImagesClient(
  roomTypeId: string,
  files: File[],
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<UploadImagesResponse> {
  const fd = new FormData();
  for (const f of files) fd.append("file", f);
  const res = await postFormDataWithProgress(
    clientProxyPath(`/room-types/${roomTypeId}/images`),
    fd,
    getStaffAuthHeaders(),
    onProgress,
  );
  return readSuccess<UploadImagesResponse>(res, "Upload room type images");
}

export async function removeRoomTypeImageClient(
  roomTypeId: string,
  objectPath: string,
): Promise<RoomTypeDto> {
  const res = await fetch(clientProxyPath(`/room-types/${roomTypeId}/images`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath }),
  });
  return readSuccess<RoomTypeDto>(res, "Remove room type image");
}

export async function uploadRoomImagesClient(
  roomId: string,
  files: File[],
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<UploadImagesResponse> {
  const fd = new FormData();
  for (const f of files) fd.append("file", f);
  const res = await postFormDataWithProgress(
    clientProxyPath(`/rooms/${roomId}/images`),
    fd,
    getStaffAuthHeaders(),
    onProgress,
  );
  return readSuccess<UploadImagesResponse>(res, "Upload room images");
}

export async function removeRoomImageClient(
  roomId: string,
  objectPath: string,
): Promise<RoomWithTypeDto> {
  const res = await fetch(clientProxyPath(`/rooms/${roomId}/images`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectPath }),
  });
  return readSuccess<RoomWithTypeDto>(res, "Remove room image");
}

/** Keys of objects already in MinIO under `room-types/{id}/` (includes files not yet in DB `images`). */
export async function listRoomTypeStorageKeysClient(roomTypeId: string): Promise<string[]> {
  const res = await fetch(clientProxyPath(`/room-types/${roomTypeId}/storage-keys`), {
    cache: "no-store",
  });
  const data = await readSuccess<{ keys: string[] }>(res, "List room type storage keys");
  return data.keys;
}

/** Keys under `rooms/{id}/` in MinIO. */
export async function listRoomStorageKeysClient(roomId: string): Promise<string[]> {
  const res = await fetch(clientProxyPath(`/rooms/${roomId}/storage-keys`), { cache: "no-store" });
  const data = await readSuccess<{ keys: string[] }>(res, "List room storage keys");
  return data.keys;
}

/**
 * Server-side fetch (direct to Fastify). For browser calls, use {@link clientProxyPath} with
 * `fetch("/api/bookings")` so Next rewrites to the backend.
 */
export async function fetchBookingsFromBackend(): Promise<BookingDto[]> {
  const url = `${getBackendBaseUrl()}/bookings`;
  const res = await fetch(url, { cache: "no-store" });
  return readSuccess<BookingDto[]>(res, "Bookings request");
}

/** Server-side: get one booking (`GET /bookings/:id`). */
export async function fetchBookingFromBackend(id: string): Promise<BookingDto> {
  const url = `${getBackendBaseUrl()}/bookings/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: "no-store" });
  return readSuccess<BookingDto>(res, "Booking request");
}

/** Server-side: list transactions (`GET /transactions`). */
export async function fetchTransactionsFromBackend(): Promise<TransactionDto[]> {
  const url = `${getBackendBaseUrl()}/transactions`;
  const res = await fetch(url, { cache: "no-store" });
  return readSuccess<TransactionDto[]>(res, "Transactions request");
}

/**
 * Server-side: hotel letterhead (`GET /hotel-info`).
 * Returns null if CMS was never configured or the request fails (invoice still renders).
 */
export async function fetchHotelInfoFromBackend(): Promise<HotelInfoDto | null> {
  const url = `${getBackendBaseUrl()}/hotel-info`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || !("success" in parsed)) {
    return null;
  }
  const body = parsed as ApiSuccessEnvelope<HotelInfoDto> | ApiErrorEnvelope;
  if (!body.success || !res.ok) {
    return null;
  }
  return body.data;
}

/** Server-side: list customers. */
export async function fetchCustomersFromBackend(): Promise<CustomerDto[]> {
  const url = `${getBackendBaseUrl()}/customers`;
  const res = await fetch(url, { cache: "no-store" });
  return readSuccess<CustomerDto[]>(res, "Customers request");
}
