-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_list_id" UUID;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_default_list_id_fkey'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_default_list_id_fkey"
      FOREIGN KEY ("default_list_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
