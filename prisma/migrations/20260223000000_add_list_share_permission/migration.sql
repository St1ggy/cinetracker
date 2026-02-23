-- CreateEnum
CREATE TYPE "share_permission" AS ENUM ('VIEW_ONLY', 'VIEW_AND_ADD');

-- AlterTable
ALTER TABLE "lists" ADD COLUMN "share_permission" "share_permission";
