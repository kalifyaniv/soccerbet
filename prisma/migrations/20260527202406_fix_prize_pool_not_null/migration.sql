/*
  Warnings:

  - Made the column `totalPrizePool` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- Fix existing NULL values before making column NOT NULL
UPDATE "Event" SET "totalPrizePool" = 0 WHERE "totalPrizePool" IS NULL;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "totalPrizePool" SET NOT NULL,
ALTER COLUMN "totalPrizePool" SET DEFAULT 0;
