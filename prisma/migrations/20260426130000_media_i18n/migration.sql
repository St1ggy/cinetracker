-- CreateTable
CREATE TABLE "media_i18n" (
    "media_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "original_title" VARCHAR(500),
    "tagline" VARCHAR(1000),
    "status" VARCHAR(100),
    "director" VARCHAR(255),
    "overview" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_i18n_pk" PRIMARY KEY ("media_id","locale")
);

-- CreateTable
CREATE TABLE "genre_i18n" (
    "genre_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "genre_i18n_pk" PRIMARY KEY ("genre_id","locale")
);

-- CreateTable
CREATE TABLE "person_i18n" (
    "person_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "person_i18n_pk" PRIMARY KEY ("person_id","locale")
);

-- CreateTable
CREATE TABLE "media_cast_i18n" (
    "media_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "role" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_cast_i18n_pk" PRIMARY KEY ("media_id","person_id","locale")
);

-- AddForeignKey
ALTER TABLE "media_i18n" ADD CONSTRAINT "media_i18n_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "genre_i18n" ADD CONSTRAINT "genre_i18n_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_i18n" ADD CONSTRAINT "person_i18n_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_cast_i18n" ADD CONSTRAINT "media_cast_i18n_cast_fk" FOREIGN KEY ("media_id", "person_id") REFERENCES "media_cast"("media_id", "person_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "media_i18n_locale_idx" ON "media_i18n"("locale");

-- CreateIndex
CREATE INDEX "media_i18n_title_idx" ON "media_i18n"("title");

-- CreateIndex
CREATE INDEX "genre_i18n_locale_idx" ON "genre_i18n"("locale");

-- CreateIndex
CREATE INDEX "person_i18n_locale_idx" ON "person_i18n"("locale");

-- CreateIndex
CREATE INDEX "media_cast_i18n_locale_idx" ON "media_cast_i18n"("locale");

-- Backfill: treat existing scalar copy as en (UI base)
INSERT INTO "media_i18n" ("media_id", "locale", "title", "original_title", "tagline", "status", "director", "overview", "updated_at")
SELECT
  "id",
  'en',
  "title",
  "original_title",
  "tagline",
  "status",
  "director",
  "overview",
  NOW()
FROM "media";

INSERT INTO "genre_i18n" ("genre_id", "locale", "name", "updated_at")
SELECT "id", 'en', "name", NOW() FROM "genres";

INSERT INTO "person_i18n" ("person_id", "locale", "name", "updated_at")
SELECT "id", 'en', "name", NOW() FROM "people";

INSERT INTO "media_cast_i18n" ("media_id", "person_id", "locale", "role", "updated_at")
SELECT "media_id", "person_id", 'en', "role", NOW() FROM "media_cast";

-- Remove legacy single-locale role column
ALTER TABLE "media_cast" DROP COLUMN "role";
