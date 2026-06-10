import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateMatchPoints } from "@/lib/scoring";
import type { GroupPredictionsMap } from "@/types";
import type { Score as ScoringScore } from "@/lib/scoring";

// PATCH /api/admin/events/[eventId]/result/[matchId]
// Enter or update a match result. Triggers point recalculation for all players.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string; matchId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const { eventId, matchId } = await params;
  const { finalScoreA, finalScoreB } = (await req.json()) as {
    finalScoreA: number;
    finalScoreB: number;
  };

  if (finalScoreA == null || finalScoreB == null) {
    return Response.json({ error: "Scores required" }, { status: 400 });
  }

  // Update match
  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      finalScoreA,
      finalScoreB,
      status: "completed",
      updatedAt: new Date(),
    },
  });

  // Get multiplier union
  const mg = await prisma.multiplierGame.findUnique({ where: { eventId } });
  const multiplierMatchNumbers: number[] = mg
    ? JSON.parse(mg.matchNumbers)
    : [];
  const isMultiplierMatch = multiplierMatchNumbers.includes(match.matchNumber);

  // Get all locked bets for this event
  const bets = await prisma.playerBet.findMany({
    where: { eventId, status: "locked" },
    include: { player: true },
  });

  const actual: ScoringScore = { a: finalScoreA, b: finalScoreB };

  // Calculate points for each player
  for (const bet of bets) {
    const predictions: GroupPredictionsMap = JSON.parse(bet.groupPredictions);
    const pred = predictions[match.matchNumber.toString()];

    if (!pred) continue; // no prediction for this match (shouldn't happen)

    const prediction: ScoringScore = { a: pred.a, b: pred.b };

    // If any player selected this match as a multiplier, it applies to everyone
    const result = calculateMatchPoints(prediction, actual, isMultiplierMatch);

    // Upsert PointLog for this player+match
    await prisma.pointLog.upsert({
      where: { playerId_matchId: { playerId: bet.playerId, matchId: match.id } },
      update: {
        prediction: JSON.stringify(prediction),
        actualResult: JSON.stringify(actual),
        basePoints: result.basePoints,
        isMultiplier: result.isMultiplier,
        multiplierFactor: result.multiplierFactor,
        finalPoints: result.finalPoints,
        scoringMethod: result.scoringMethod,
        calculatedAt: new Date(),
      },
      create: {
        playerId: bet.playerId,
        matchId: match.id,
        eventId,
        matchNumber: match.matchNumber,
        groupLetter: match.groupLetter,
        prediction: JSON.stringify(prediction),
        actualResult: JSON.stringify(actual),
        basePoints: result.basePoints,
        isMultiplier: result.isMultiplier,
        multiplierFactor: result.multiplierFactor,
        finalPoints: result.finalPoints,
        scoringMethod: result.scoringMethod,
      },
    });
  }

  // Recalculate totals for every player
  await recalculatePlayerTotals(eventId);

  return Response.json({
    message: "Result saved and points calculated",
    match: {
      id: match.id,
      matchNumber: match.matchNumber,
      finalScoreA,
      finalScoreB,
    },
  });
}

async function recalculatePlayerTotals(eventId: string) {
  const players = await prisma.player.findMany({
    where: { eventId },
    include: {
      pointsLog: { where: { eventId } },
      bonusLog: true,
      playerBet: true,
    },
  });

  for (const player of players) {
    const groupStagePoints = player.pointsLog.reduce(
      (sum, log) => sum + log.finalPoints,
      0
    );
    const kingOfGoalsPoints = player.bonusLog?.kingOfGoalsPoints ?? 0;
    const tournamentWinnerPoints = player.bonusLog?.tournamentWinnerPoints ?? 0;
    const totalPoints =
      groupStagePoints + kingOfGoalsPoints + tournamentWinnerPoints;

    await prisma.player.update({
      where: { id: player.id },
      data: { totalPoints, updatedAt: new Date() },
    });

    if (player.playerBet) {
      await prisma.playerBet.update({
        where: { id: player.playerBet.id },
        data: {
          groupStagePoints,
          kingOfGoalsPoints: player.bonusLog?.kingOfGoalsPoints,
          tournamentWinnerPoints: player.bonusLog?.tournamentWinnerPoints,
          totalPoints,
          updatedAt: new Date(),
        },
      });
    }
  }
}

// Re-export so other admin endpoints can reuse
export { recalculatePlayerTotals };
