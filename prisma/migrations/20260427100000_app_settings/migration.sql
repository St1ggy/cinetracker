-- App-wide settings (single row, id = 'app').

CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "genre_alias_groups" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- Default: science-fiction as an example (editable in app settings / profile).
INSERT INTO "app_settings" ("id", "genre_alias_groups", "updated_at")
VALUES (
  'app',
  '{"groups":[{"canonical":"science-fiction","displayName":"Science Fiction","slugs":["tmdb-878","sci-fi","science-fiction","scifi","sciencefiction"]}]}',
  CURRENT_TIMESTAMP
);
