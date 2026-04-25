-- Reconcile drift: if `id` lost DEFAULT (e.g. after manual changes / push), restore what prior migrations created.
ALTER TABLE "tags" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "list_ratings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "media_ratings" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
