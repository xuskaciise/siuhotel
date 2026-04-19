-- CreateEnum

CREATE TYPE "UserRole" AS ENUM ('STAFF', 'ADMIN');



-- CreateTable

CREATE TABLE "users" (

    "id" TEXT NOT NULL,

    "email" TEXT NOT NULL,

    "password_hash" TEXT NOT NULL,

    "full_name" TEXT NOT NULL,

    "role" "UserRole" NOT NULL DEFAULT 'STAFF',

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "updatedAt" TIMESTAMP(3) NOT NULL,



    CONSTRAINT "users_pkey" PRIMARY KEY ("id")

);



CREATE UNIQUE INDEX "users_email_key" ON "users"("email");



-- AlterTable

ALTER TABLE "customers" ADD COLUMN "email" TEXT;

ALTER TABLE "customers" ADD COLUMN "password_hash" TEXT;



CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");



ALTER TABLE "bookings" ADD COLUMN "staff_id" TEXT;



ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

