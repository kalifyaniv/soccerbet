-- Prize pool is now calculated at runtime as totalPlayers * entryFee
ALTER TABLE "Event" DROP COLUMN "totalPrizePool";
