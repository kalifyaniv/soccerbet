import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/events/[eventId]/leaderboard
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const players = await prisma.player.findMany({
    where: { eventId },
    include: {
      playerBet: {
        select: {
          status: true,
          multiplierGames: true,
          kingOfGoalsPoints: true,
          tournamentWinnerPoints: true,
          groupStagePoints: true,
          totalPoints: true,
        },
      },
    },
    orderBy: { totalPoints: "desc" },
  });

  const leaderboard = players.map((p, idx) => ({
    rank: idx + 1,
    playerId: p.id,
    playerName: p.name,
    totalPoints: p.totalPoints,
    kingOfGoalsPoints: p.playerBet?.kingOfGoalsPoints ?? null,
    tournamentWinnerPoints: p.playerBet?.tournamentWinnerPoints ?? null,
    betStatus: p.playerBet?.status ?? null,
    groupStagePoints: p.playerBet?.groupStagePoints ?? null,
  }));

  return Response.json({ leaderboard, lastUpdated: new Date().toISOString() });
}
