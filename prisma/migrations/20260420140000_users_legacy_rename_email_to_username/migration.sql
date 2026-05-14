-- Legacy databases (e.g. Supabase) that still have only `email` for login and no `username` column.
-- Aligns with Prisma `User`: required `username`, optional `email`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username'
  ) THEN
    DROP INDEX IF EXISTS "users_email_key";
    ALTER TABLE "users" RENAME COLUMN "email" TO "username";
    CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
    ALTER TABLE "users" ADD COLUMN "email" TEXT;
    CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
  END IF;
END $$;
