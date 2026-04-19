# API testing — Room, RoomType, User, Customer & Booking APIs

This document describes how to exercise the HTTP APIs with Postman (or similar). Routes match the Fastify modules under `src/modules/*` (no global `/api` prefix). **Staff flows** use `POST /customers` (walk-in) and `POST /bookings` with optional **`createdBy`** (staff user id; legacy JSON key `staffId` is still accepted). **App registration** uses `POST /customers/register`. **Guest / website** uses **`GET /public/rooms`** and **`GET /public/hero`** (no auth).

**Base URL (development):** `http://localhost:3000`  
(Default port from `PORT` in `.env`; if unset, the server uses **3000**.)

**Response envelope (all endpoints):**

- Success: `{ "success": true, "data": ... }` with status **200** or **201** where noted.
- Error: `{ "success": false, "error": { "code": "...", "message": "...", "details"?: ... } }`

**MinIO (room images):** Uploads use bucket **`hotel-pos-assets`** via `src/lib/minio.ts`. On first upload, the server calls **`ensureBucketExists`** so the bucket is created automatically if MinIO allows it. Ensure `.env` has valid `MINIO_*` values (optional **`MINIO_REGION`**, default `us-east-1`, used by `makeBucket`).

### Image uploads — Postman checklist (if `images` stays `[]`)

1. **Body** must be **form-data**, not **raw JSON**. Do **not** add a manual `Content-Type` header; Postman sets `multipart/form-data` with boundary.
2. Add a row with type **File** (key can be `file` or any name). The server reads the **first file part** and drains the rest.
3. After **201**, call **GET** `/room-types/:id` or **GET** `/rooms/:id` again — the `images` array should include every path in `data.objectPaths` from the upload response (one or many files per request).
4. If you see **`NOT_MULTIPART`**, you sent JSON or wrong content type. If **`NO_FILE`**, no file part was found (empty form-data or only text fields).
5. If you see **`STORAGE_UNAVAILABLE` (503)** with `ECONNREFUSED`, MinIO is not running or **`MINIO_ENDPOINT` / `MINIO_PORT`** in `.env` point to the wrong host. Start MinIO (e.g. port **9000**) or use your remote MinIO IP/hostname.

---

## How to run the server (development)

From the `backend/` directory:

```bash
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL, MinIO vars, PORT if needed
npx prisma migrate deploy
npm run dev
```

The API listens on `HOST` (default `0.0.0.0`) and `PORT` (default `3000`). Open `http://localhost:3000/health` to confirm the process is up.

---

## How to inspect the database (Prisma Studio)

From `backend/`:

```bash
npx prisma studio
```

This opens a browser UI (default **http://localhost:5555**) to browse `room_types`, `rooms`, `users`, `customers`, `bookings`, `transactions`, and other tables after migrations have been applied.

---

## Standard headers

| Header | When |
|--------|------|
| `Content-Type: application/json` | All JSON bodies (**POST** / **PUT** / **DELETE** with JSON). |
| *(none special)* | **GET** requests without a body. |
| *(do not set `Content-Type` manually)* | **Multipart** uploads: let the client set `multipart/form-data` with boundary (Postman does this in **Body → form-data**). |

---

## RoomType endpoints

### 1. Create room type

| | |
|---|---|
| **Method / URL** | `POST /room-types` |
| **Headers** | `Content-Type: application/json` |
| **Body (example)** | See below |
| **Success** | **201** — `data` is the created room type (`basePrice` is a decimal **string**, e.g. `"120.00"`). |

**Example JSON request body:**

```json
{
  "name": "Deluxe King",
  "basePrice": 189.5,
  "description": "King bed, city view",
  "images": []
}
```

**Example success response (201):**

```json
{
  "success": true,
  "data": {
    "id": "clxxxxxxxxxxxxxxxxxxxxxx",
    "name": "Deluxe King",
    "basePrice": "189.50",
    "description": "King bed, city view",
    "images": [],
    "createdAt": "2026-04-17T12:00:00.000Z",
    "updatedAt": "2026-04-17T12:00:00.000Z"
  }
}
```

**Common errors**

| Status | `error.code` (typical) | When |
|--------|------------------------|------|
| **400** | `VALIDATION_ERROR` | Zod validation failed (e.g. missing `name`, invalid `basePrice`). |
| **500** | `INTERNAL_ERROR` | Unexpected server/database failure. |

---

### 2. List all room types

| | |
|---|---|
| **Method / URL** | `GET /room-types` |
| **Headers** | None required |
| **Body** | — |
| **Success** | **200** — `data` is an **array** of room types. |

**Example success response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxxxxxxxxxxxxxxxxxxx",
      "name": "Deluxe King",
      "basePrice": "189.50",
      "description": "King bed, city view",
      "images": [],
      "createdAt": "2026-04-17T12:00:00.000Z",
      "updatedAt": "2026-04-17T12:00:00.000Z"
    }
  ]
}
```

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **500** | `INTERNAL_ERROR` | Unexpected failure. |

---

### 3. Get room type by ID

| | |
|---|---|
| **Method / URL** | `GET /room-types/:id` |
| **Headers** | None required |
| **Body** | — |
| **Success** | **200** — `data` is one room type. |

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **404** | `ROOM_TYPE_NOT_FOUND` | Unknown `id`. |
| **500** | `INTERNAL_ERROR` | Unexpected failure. |

---

### 4. Update room type

| | |
|---|---|
| **Method / URL** | `PUT /room-types/:id` |
| **Headers** | `Content-Type: application/json` |
| **Body** | At least one field required among `name`, `basePrice`, `description` (use `null` for `description` to clear). |

**Example JSON request body:**

```json
{
  "name": "Deluxe King Suite",
  "basePrice": 219.99
}
```

**Success** | **200** — updated room type in `data`.

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **400** | `VALIDATION_ERROR` | Invalid body or empty update object. |
| **404** | `ROOM_TYPE_NOT_FOUND` | Unknown `id`. |
| **500** | `INTERNAL_ERROR` | Unexpected failure. |

---

### 5. Upload room-type image (multipart)

| | |
|---|---|
| **Method / URL** | `POST /room-types/:id/images` |
| **Headers** | *(multipart — do not force JSON `Content-Type`)* |
| **Body** | **form-data**: one part of type **File** (any field name; the server reads the first file part). Allowed MIME types: **JPEG, PNG, WebP, GIF**. |
| **Success** | **201** — `data.objectPaths` is a **string array** of every MinIO key uploaded in this request (bucket **`hotel-pos-assets`**); all are appended to the room type’s `images` array in one update. |

**Example success response (201) — three files:**

```json
{
  "success": true,
  "data": {
    "objectPaths": [
      "room-types/clxxxxxxxxxxxxxxxxxxxxxx/uuid-a.jpg",
      "room-types/clxxxxxxxxxxxxxxxxxxxxxx/uuid-b.jpg",
      "room-types/clxxxxxxxxxxxxxxxxxxxxxx/uuid-c.jpg"
    ]
  }
}
```

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **400** | `NOT_MULTIPART` | Request was not `multipart/form-data` (e.g. raw JSON used by mistake). |
| **400** | `NO_FILE` | No file part in the multipart body. |
| **400** | `INVALID_FILE_TYPE` | MIME type not in the allowed image list. |
| **404** | `ROOM_TYPE_NOT_FOUND` | Unknown `id`. |
| **500** | `INTERNAL_ERROR` | MinIO/DB failure. |

---

### 6. Remove room-type image

| | |
|---|---|
| **Method / URL** | `DELETE /room-types/:id/images` |
| **Headers** | `Content-Type: application/json` |
| **Body** | `{ "objectPath": "<exact path returned from upload or stored in DB>" }` |
| **Success** | **200** — `data` is the updated room type (path removed from `images`; object removed from **hotel-pos-assets**). |

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **400** | `VALIDATION_ERROR` / `INVALID_IMAGE_PATH` | Bad JSON or path not in this room type’s `images`. |
| **404** | `ROOM_TYPE_NOT_FOUND` | Unknown `id`. |
| **500** | `INTERNAL_ERROR` | MinIO/DB failure. |

---

## Room endpoints

### 7. Create room

| | |
|---|---|
| **Method / URL** | `POST /rooms` |
| **Headers** | `Content-Type: application/json` |
| **Body** | `roomNumber`, `roomTypeId` (CUID from a room type), optional `status`, optional `images` (existing object paths). |

**Example JSON request body:**

```json
{
  "roomNumber": "301",
  "roomTypeId": "{{room_type_id_from_list_or_create}}",
  "status": "AVAILABLE"
}
```

**Success** | **201** — `data` is the room including nested `roomType` (`basePrice` as string).

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **400** | `VALIDATION_ERROR` | Invalid body. |
| **400** | `INVALID_ROOM_TYPE` | Foreign key: `roomTypeId` does not exist. |
| **409** | `ROOM_NUMBER_TAKEN` | `roomNumber` already exists. |
| **500** | `INTERNAL_ERROR` | Unexpected failure. |

---

### 8. List rooms (optional filters)

| | |
|---|---|
| **Method / URL** | `GET /rooms` |
| **Query** | Optional: `status` = `AVAILABLE` \| `OCCUPIED` \| `MAINTENANCE`; optional: `roomTypeId` = CUID. |
| **Example** | `GET /rooms?status=AVAILABLE&roomTypeId=clxxxxxxxxxxxxxxxxxxxxxx` |
| **Success** | **200** — `data` is an array of rooms with `roomType`. |

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **400** | `VALIDATION_ERROR` | Invalid query values. |
| **500** | `INTERNAL_ERROR` | Unexpected failure. |

---

### 9. Get room by ID

| | |
|---|---|
| **Method / URL** | `GET /rooms/:id` |
| **Success** | **200** — `data` is one room with `roomType`. |

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **404** | `ROOM_NOT_FOUND` | Unknown `id`. |
| **500** | `INTERNAL_ERROR` | Unexpected failure. |

---

### 10. Update room (including status)

| | |
|---|---|
| **Method / URL** | `PUT /rooms/:id` |
| **Headers** | `Content-Type: application/json` |
| **Body** | At least one of: `roomNumber`, `roomTypeId`, `status`. |

**Example JSON — update status only:**

```json
{
  "status": "OCCUPIED"
}
```

**Success** | **200** — `data` is the updated room with `roomType`.

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **400** | `VALIDATION_ERROR` | Invalid body or empty update. |
| **400** | `INVALID_ROOM_TYPE` | `roomTypeId` invalid. |
| **404** | `ROOM_NOT_FOUND` | Unknown room `id`. |
| **409** | `ROOM_NUMBER_TAKEN` | Duplicate `roomNumber`. |
| **500** | `INTERNAL_ERROR` | Unexpected failure. |

---

### 11. Upload room image (multipart)

| | |
|---|---|
| **Method / URL** | `POST /rooms/:id/images` |
| **Body** | **form-data**: one **File** part. Same MIME rules as room-type images. |
| **Success** | **201** — `data.objectPaths` lists every uploaded key under **`hotel-pos-assets`**; all are appended to the room’s `images` array in one update. |

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **400** | `NOT_MULTIPART` / `NO_FILE` / `INVALID_FILE_TYPE` | Wrong body type, missing file, or bad MIME. |
| **404** | `ROOM_NOT_FOUND` | Unknown room `id`. |
| **500** | `INTERNAL_ERROR` | MinIO/DB failure. |

---

### 12. Remove room image

| | |
|---|---|
| **Method / URL** | `DELETE /rooms/:id/images` |
| **Headers** | `Content-Type: application/json` |
| **Body** | `{ "objectPath": "rooms/clxxx/....jpg" }` |
| **Success** | **200** — updated room in `data`. |

**Common errors**

| Status | `error.code` | When |
|--------|--------------|------|
| **400** | `VALIDATION_ERROR` / `INVALID_IMAGE_PATH` | Bad body or path not in `images`. |
| **404** | `ROOM_NOT_FOUND` | Unknown room `id`. |
| **500** | `INTERNAL_ERROR` | Unexpected failure. |

---

## User (staff) endpoints

### 12a. Create staff user

| | |
|---|---|
| **Method / URL** | `POST /users` |
| **Headers** | `Content-Type: application/json` |
| **Body** | `email`, `password` (min 8), `fullName`, optional **`roleId`** (defaults to the **`STAFF`** role from `GET /roles`). |

**Success** | **201** — created user in `data` with nested **`role`** and **`permissions`** (no password hash). **409** `EMAIL_TAKEN`. **404** `ROLE_NOT_FOUND` if `roleId` is invalid.

### 12b. List staff users

`GET /users` — **200**, array ordered by `createdAt` descending; each user includes **`role`** and permission codes.

---

## Customer endpoints

JSON field names are **camelCase**. API responses **never** include a password or password hash. Optional `email` appears after app registration or manual updates.

### 13. Create customer (walk-in / staff)

| | |
|---|---|
| **Method / URL** | `POST /customers` |
| **Headers** | `Content-Type: application/json` |
| **Body** | **`fullName`**, **`phoneNumber`** only (reception walk-in). |

**Example body:**

```json
{
  "fullName": "Amina Hassan",
  "phoneNumber": "+252612345678"
}
```

**Success** | **201** — created customer in `data`.

**Common errors:** **400** `VALIDATION_ERROR`; **409** `PHONE_NUMBER_TAKEN`.

---

### 13b. Register customer (app)

| | |
|---|---|
| **Method / URL** | `POST /customers/register` |
| **Headers** | `Content-Type: application/json` |
| **Body** | `fullName`, `phoneNumber` (unique), **`email`** (unique), **`password`** (min 8). |

**Success** | **201**. **409** `EMAIL_TAKEN` or `PHONE_NUMBER_TAKEN`.

---

### 14. List customers

`GET /customers` — **200**, `data` is an array (newest first).

---

### 15. Get customer by id

`GET /customers/:id` — **200** / **404** `CUSTOMER_NOT_FOUND`.

---

### 16. Update customer

`PUT /customers/:id` — JSON partial; optional `fullName`, `phoneNumber`, `email` (**`null`** clears email), **`password`** (min 8, re-hashes), `idCard` / `address` (**`null`** clears).

---

### 17. Delete customer

`DELETE /customers/:id` — **200**, `data`: `{ "deleted": true }`. **404** if unknown id.

---

## Booking endpoints

**Enums:** `status` on create may be **`PENDING`** or **`CONFIRMED`** (default **`CONFIRMED`**). **On create**, the room is always set to **`OCCUPIED`** after a successful check-in. **`PENDING`** / **`CONFIRMED`** still participate in overlap checks for future bookings.

### 18. Create booking

| | |
|---|---|
| **Method / URL** | `POST /bookings` |
| **Headers** | `Content-Type: application/json` |
| **Body** | `customerId`, `roomId`, `checkIn`, `checkOut` (ISO datetimes), optional **`createdBy`** (staff `users.id`; legacy **`staffId`** accepted), optional `totalPrice` (else nights × room type `basePrice`), optional `status`. |

**Example:**

```json
{
  "customerId": "clxxxxxxxxxxxxxxxxxxxxxx",
  "roomId": "clyyyyyyyyyyyyyyyyyyyyyy",
  "createdBy": "clzzzzzzzzzzzzzzzzzzzzzz",
  "checkIn": "2026-06-01T14:00:00.000Z",
  "checkOut": "2026-06-04T11:00:00.000Z"
}
```

**Success** | **201** — booking with `customer`, `room` (+ `roomType`), optional **`createdBy`** staff snippet; `totalPrice` as string. **Room** is set to **`OCCUPIED`** on every successful check-in create.

**Common errors:** **400** `ROOM_NOT_AVAILABLE`, **404** `CUSTOMER_NOT_FOUND` / `ROOM_NOT_FOUND` / `STAFF_NOT_FOUND`, **409** `ROOM_ALREADY_BOOKED`.

---

### 19. List / get bookings

- `GET /bookings` — **200**, list with relations.
- `GET /bookings/:id` — **200** / **404** `BOOKING_NOT_FOUND`.

---

### 20. Check-out booking

- `POST /bookings/:id/checkout` — sets booking **`COMPLETED`** and room **`AVAILABLE`**.
- `PUT /bookings/:id/check-out` — same behavior (REST-style alias).

**400** `BOOKING_ALREADY_CLOSED` if already completed, checked out, or cancelled.

---

## Transaction (payment) endpoints

`paymentMethod`: **`CASH`** \| **`EVC_PLUS`** \| **`PREMIER_BANK`** \| **`SAHAL`**.  
`status`: **`COMPLETED`** \| **`REFUNDED`** (default **COMPLETED** on create).

### 21. Create transaction

`POST /transactions` — JSON: `bookingId`, `amount`, `paymentMethod`, optional `status`. **201**. **404** `BOOKING_NOT_FOUND`.

### 22. List / get / update / delete transactions

- `GET /transactions`
- `GET /transactions/:id`
- `PUT /transactions/:id` — partial body (`amount`, `paymentMethod`, `status`).
- `DELETE /transactions/:id` — **200** `{ "deleted": true }`.

---

## Dashboard

### 23. Stats

`GET /stats` — **200**, `data`:

- `totalRooms` (number)
- `availableRooms` (count where room status is `AVAILABLE`)
- `totalCustomers`
- `totalRevenueToday` (string decimal) — sum of **`COMPLETED`** transactions whose `createdAt` is **today (UTC calendar day)**.

---

## Public (website) endpoints

| Method / URL | Purpose |
|----------------|--------|
| `GET /public/rooms` | **AVAILABLE** rooms with nested room type (`basePrice` as string). Optional query `roomTypeId`. |
| `GET /public/hero` | Active hero slides (`isActive: true`), sorted by `order`. |

---

## Roles (RBAC)

`GET /roles` — **200**, each role includes **`permissions`** (`code`, `description`). Staff users reference a **`roleId`** (see `POST /users`).

---

## CMS (dashboard)

| Method / URL | Purpose |
|----------------|--------|
| `GET /hero-sections` | List all slider rows (staff / dashboard). |
| `POST /hero-sections` | Create slide (`imageUrl`, `title`, optional `subTitle`, `isActive`, `order`). |
| `GET /hero-sections/:id` | Get one slide. |
| `PUT /hero-sections/:id` | Update slide. |
| `DELETE /hero-sections/:id` | Delete slide. |
| `GET /hotel-info` | Singleton hotel profile (seeded row). |
| `PUT /hotel-info` | Upsert hotel profile (`name`, `address`, `phone`, `email`, `aboutUs`, `logoUrl`). |

---

## Postman import

Import **`docs/hotel-pos.postman_collection.json`**. Top-level folders are **Staff APIs** and **Guest/Public APIs**. Set **`baseUrl`**, **`room_type_id`**, **`room_id`**, **`customer_id`**, **`staff_id`**, **`booking_id`**; optional **`role_staff_id`** defaults to **`seed_role_staff`** after migration. Run **`npm run db:seed`** for demo staff `reception@siu-hotel.local` / **`StaffDemo123!`**.

After schema changes: **`npx prisma migrate deploy`** (or **`npx prisma migrate dev --name your_migration_name`** in development).
