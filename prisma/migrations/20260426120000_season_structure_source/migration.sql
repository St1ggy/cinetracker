-- CreateEnum
CREATE TYPE "season_structure_source" AS ENUM ('CATALOG', 'USER');

-- AlterTable
ALTER TABLE "list_items" ADD COLUMN "season_structure_source" "season_structure_source";
