-- AlterTable: add handle_changed_at and is_anonymous fields
ALTER TABLE "users"
  ADD COLUMN "handle_changed_at" TIMESTAMPTZ(6);

ALTER TABLE "lists"
  ADD COLUMN "is_anonymous" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: tags
CREATE TABLE "tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(100) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateTable: list_tags (join table)
CREATE TABLE "list_tags" (
  "list_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  CONSTRAINT "list_tags_pkey" PRIMARY KEY ("list_id", "tag_id")
);

-- CreateIndex
CREATE INDEX "list_tags_tag_idx" ON "list_tags"("tag_id");

-- AddForeignKey: list_tags -> lists
ALTER TABLE "list_tags"
  ADD CONSTRAINT "list_tags_list_id_fkey"
  FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: list_tags -> tags
ALTER TABLE "list_tags"
  ADD CONSTRAINT "list_tags_tag_id_fkey"
  FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: list_ratings
CREATE TABLE "list_ratings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "list_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "value" SMALLINT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "list_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "list_ratings_list_user_unique" ON "list_ratings"("list_id", "user_id");
CREATE INDEX "list_ratings_list_idx" ON "list_ratings"("list_id");

-- AddForeignKey: list_ratings -> lists
ALTER TABLE "list_ratings"
  ADD CONSTRAINT "list_ratings_list_id_fkey"
  FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: list_ratings -> users
ALTER TABLE "list_ratings"
  ADD CONSTRAINT "list_ratings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
