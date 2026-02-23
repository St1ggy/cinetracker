-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "list_visibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "media_provider" AS ENUM ('TMDB', 'ANILIST', 'OMDB', 'TVDB', 'JIKAN', 'KITSU', 'TRAKT');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('MOVIE', 'TV', 'ANIME', 'CARTOON', 'OTHER');

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('WATCHED', 'IN_PROGRESS', 'PLAN_TO_WATCH');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255),
    "email_verified" TIMESTAMPTZ(6),
    "name" VARCHAR(255),
    "image" TEXT,
    "handle" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_api_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "media_provider" NOT NULL,
    "encrypted_data" TEXT NOT NULL,
    "iv" VARCHAR(64) NOT NULL,
    "auth_tag" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "user_id" UUID NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(255) NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" VARCHAR(255),
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","provider_account_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_token" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_token")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "lists" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(400),
    "visibility" "list_visibility" NOT NULL DEFAULT 'PRIVATE',
    "share_token" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_lists" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "list_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "media_type" "media_type" NOT NULL DEFAULT 'OTHER',
    "title" VARCHAR(500) NOT NULL,
    "original_title" VARCHAR(500),
    "year" INTEGER,
    "overview" TEXT,
    "poster_url" TEXT,
    "backdrop_url" TEXT,
    "runtime_minutes" INTEGER,
    "episode_runtime_min" INTEGER,
    "episode_runtime_max" INTEGER,
    "seasons_count" INTEGER,
    "episodes_count" INTEGER,
    "season_breakdown" JSONB,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_adult" BOOLEAN NOT NULL DEFAULT false,
    "imdb_id" VARCHAR(32),
    "tmdb_id" INTEGER,
    "anilist_id" INTEGER,
    "tvdb_id" INTEGER,
    "mal_id" INTEGER,
    "kitsu_id" INTEGER,
    "trakt_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_items" (
    "id" UUID NOT NULL,
    "list_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "added_by_user_id" UUID NOT NULL,
    "notes" VARCHAR(500),
    "rating" INTEGER,
    "status" "WatchStatus",
    "current_season" INTEGER,
    "current_episode" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_sources" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "provider" "media_provider" NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "external_url" TEXT,
    "last_fetched_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "etag" VARCHAR(255),
    "raw_json" JSONB,
    "normalized_json" JSONB,

    CONSTRAINT "media_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_genres" (
    "media_id" UUID NOT NULL,
    "genre_id" UUID NOT NULL,

    CONSTRAINT "media_genres_pkey" PRIMARY KEY ("media_id","genre_id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "tmdb_person_id" INTEGER,
    "anilist_staff_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_cast" (
    "media_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "role" VARCHAR(255),
    "cast_order" INTEGER,

    CONSTRAINT "media_cast_pkey" PRIMARY KEY ("media_id","person_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "user_api_keys_user_provider_unique" ON "user_api_keys"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "lists_share_token_unique" ON "lists"("share_token");

-- CreateIndex
CREATE INDEX "lists_owner_updated_idx" ON "lists"("owner_user_id", "updated_at");

-- CreateIndex
CREATE INDEX "lists_visibility_updated_idx" ON "lists"("visibility", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_lists_user_list_unique" ON "saved_lists"("user_id", "list_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_imdb_unique" ON "media"("imdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_tmdb_unique" ON "media"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_anilist_unique" ON "media"("anilist_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_tvdb_unique" ON "media"("tvdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_mal_unique" ON "media"("mal_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_kitsu_unique" ON "media"("kitsu_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_trakt_unique" ON "media"("trakt_id");

-- CreateIndex
CREATE INDEX "media_title_idx" ON "media"("title");

-- CreateIndex
CREATE INDEX "media_year_idx" ON "media"("year");

-- CreateIndex
CREATE INDEX "list_items_list_created_idx" ON "list_items"("list_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "list_items_unique_per_list_media" ON "list_items"("list_id", "media_id");

-- CreateIndex
CREATE INDEX "media_sources_provider_external_idx" ON "media_sources"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_sources_provider_external_unique" ON "media_sources"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");

-- CreateIndex
CREATE INDEX "media_genres_genre_idx" ON "media_genres"("genre_id");

-- CreateIndex
CREATE UNIQUE INDEX "people_tmdb_unique" ON "people"("tmdb_person_id");

-- CreateIndex
CREATE UNIQUE INDEX "people_anilist_unique" ON "people"("anilist_staff_id");

-- CreateIndex
CREATE INDEX "people_name_idx" ON "people"("name");

-- CreateIndex
CREATE INDEX "media_cast_person_idx" ON "media_cast"("person_id");

-- AddForeignKey
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_lists" ADD CONSTRAINT "saved_lists_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_sources" ADD CONSTRAINT "media_sources_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_genres" ADD CONSTRAINT "media_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_cast" ADD CONSTRAINT "media_cast_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_cast" ADD CONSTRAINT "media_cast_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

