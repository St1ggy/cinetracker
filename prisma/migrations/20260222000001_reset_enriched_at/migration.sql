-- Reset enrichedAt for all media to force re-enrichment with updated provider adapters.
-- This is needed because the first enrichment run may have been missing cross-reference IDs
-- (e.g. TMDB TV shows without imdbId, AniList without malId).
UPDATE "media" SET "enriched_at" = NULL;
