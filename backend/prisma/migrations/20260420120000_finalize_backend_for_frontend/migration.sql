-- Permissions & roles (RBAC)
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "code", "description", "createdAt", "updatedAt") VALUES
('seed_perm_bookings_view', 'bookings.view', 'View bookings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_perm_bookings_create', 'bookings.create', 'Create bookings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_perm_rooms_manage', 'rooms.manage', 'Manage rooms', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_perm_dashboard_view', 'dashboard.view', 'View dashboard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_perm_content_manage', 'content.manage', 'Manage CMS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_perm_users_manage', 'users.manage', 'Manage users', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "roles" ("id", "name", "description", "createdAt", "updatedAt") VALUES
('seed_role_staff', 'STAFF', 'Hotel staff', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('seed_role_admin', 'ADMIN', 'Administrator', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "role_permissions" ("role_id", "permission_id") SELECT 'seed_role_admin', "id" FROM "permissions";

INSERT INTO "role_permissions" ("role_id", "permission_id") VALUES
('seed_role_staff', 'seed_perm_bookings_view'),
('seed_role_staff', 'seed_perm_bookings_create'),
('seed_role_staff', 'seed_perm_dashboard_view');

-- Users: replace enum UserRole with FK to Role
ALTER TABLE "users" ADD COLUMN "role_id" TEXT;

UPDATE "users" SET "role_id" = 'seed_role_staff' WHERE "role" = 'STAFF'::"UserRole";
UPDATE "users" SET "role_id" = 'seed_role_admin' WHERE "role" = 'ADMIN'::"UserRole";
UPDATE "users" SET "role_id" = 'seed_role_staff' WHERE "role_id" IS NULL;

ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users" DROP COLUMN "role";

DROP TYPE "UserRole";

-- Bookings: staff_id -> created_by
ALTER TABLE "bookings" ADD COLUMN "created_by" TEXT;

UPDATE "bookings" SET "created_by" = "staff_id" WHERE "staff_id" IS NOT NULL;

ALTER TABLE "bookings" DROP CONSTRAINT "bookings_staff_id_fkey";

ALTER TABLE "bookings" DROP COLUMN "staff_id";

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New terminal booking status for check-out flow
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

-- Website CMS tables
CREATE TABLE "hero_sections" (
    "id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sub_title" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hero_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hotel_info" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "about_us" TEXT NOT NULL,
    "logo_url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hotel_info_pkey" PRIMARY KEY ("id")
);

INSERT INTO "hotel_info" ("id", "name", "address", "phone", "email", "about_us", "logo_url", "createdAt", "updatedAt")
VALUES (
    'seed_hotel_info_singleton',
    'SIU Hotel',
    '123 Main Street',
    '+252000000000',
    'info@siu-hotel.local',
    'Welcome to SIU Hotel.',
    '',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
