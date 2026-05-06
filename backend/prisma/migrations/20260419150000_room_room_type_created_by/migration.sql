-- AlterTable
ALTER TABLE "room_types" ADD COLUMN "created_by" TEXT;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN "created_by" TEXT;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
