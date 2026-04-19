/**
 * REST client for the Fastify backend (`AI_RULES.md.txt`).
 * Development: backend defaults to `http://localhost:3000` with routes at `/bookings`, etc. (no `/api` prefix on the server).
 * The Next.js app rewrites `/api/*` → backend `/*` so browser calls stay same-origin.
 */

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
  email: string;
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

export type RoomDisplayStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING";

export function mapRoomStatusToDisplay(status: RoomStatus): RoomDisplayStatus {
  if (status === "MAINTENANCE") return "CLEANING";
  return status;
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
}

export interface ListRoomsQueryParams {
  status?: RoomStatus;
  roomTypeId?: string;
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

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error("Empty response body");
  }
  return JSON.parse(text) as T;
}

async function readSuccess<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status})`);
  }
  const body = await parseJson<ApiSuccessEnvelope<T> | ApiErrorEnvelope>(res);
  if (!body.success) {
    throw new Error(body.error.message);
  }
  return body.data;
}

function roomsListQueryString(query?: ListRoomsQueryParams): string {
  const qs = new URLSearchParams();
  if (query?.status) qs.set("status", query.status);
  if (query?.roomTypeId) qs.set("roomTypeId", query.roomTypeId);
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
  const res = await fetch(url, { cache: "no-store" });
  return readSuccess<RoomWithTypeDto[]>(res, "Rooms request");
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
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
  onProgress?: (event: UploadProgressEvent) => void,
): Promise<Response> {
  const url = path.startsWith("/") ? path : `/${path}`;
  return await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
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
