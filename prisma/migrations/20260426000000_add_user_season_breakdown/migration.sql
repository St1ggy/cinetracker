-- ListItem: optional per-user season/episode count grid (overrides media.season_breakdown for that entry).
ALTER TABLE "list_items" ADD COLUMN "user_season_breakdown" JSONB;
