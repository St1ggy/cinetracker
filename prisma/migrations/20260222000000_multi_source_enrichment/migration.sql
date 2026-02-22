-- AlterTable: add new fields to media
ALTER TABLE "media"
  ADD COLUMN "tagline" VARCHAR(1000),
  ADD COLUMN "status" VARCHAR(100),
  ADD COLUMN "director" VARCHAR(255),
  ADD COLUMN "enriched_at" TIMESTAMPTZ(6);

-- AlterTable: add profileUrl to media_cast
ALTER TABLE "media_cast"
  ADD COLUMN "profile_url" TEXT;

-- CreateTable: media_ratings
CREATE TABLE "media_ratings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "media_id" UUID NOT NULL,
  "provider" "media_provider" NOT NULL,
  "source" VARCHAR(100) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "max_value" DOUBLE PRECISION NOT NULL,
  "votes" INTEGER,
  CONSTRAINT "media_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_ratings_media_idx" ON "media_ratings"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_ratings_media_provider_unique" ON "media_ratings"("media_id", "provider");

-- AddForeignKey
ALTER TABLE "media_ratings"
  ADD CONSTRAINT "media_ratings_media_id_fkey"
  FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
