-- AlterTable: login identifier (unique, required)
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Backfill from existing email local-part (lowercase)
UPDATE "users" SET "username" = lower(split_part(COALESCE("email", 'user'), '@', 1));

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Email becomes optional (contact / legacy); login uses username
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
