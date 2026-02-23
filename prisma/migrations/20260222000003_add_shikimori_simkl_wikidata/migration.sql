-- Add new media provider enum values for Shikimori, Simkl, and Wikidata.
-- PostgreSQL requires adding enum values in separate statements.
ALTER TYPE "media_provider" ADD VALUE 'SHIKIMORI';
ALTER TYPE "media_provider" ADD VALUE 'SIMKL';
ALTER TYPE "media_provider" ADD VALUE 'WIKIDATA';

-- Reset enriched_at for all media so they will be re-enriched
-- and pick up data from the newly added providers.
UPDATE "media" SET "enriched_at" = NULL;
