import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string; groupLetter: string }> }
) {
  const { eventId, groupLetter } = await params;

  const activePlayers = await prisma.player.findMany({
    where: { eventId, user: { disabled: false } },
    select: { id: true, name: true },
  });
  const activePlayerIds = activePlayers.map((p) => p.id);
  const playerMap = Object.fromEntries(activePlayers.map((p) => [p.id, p.name]));

  const logs = await prisma.pointLog.groupBy({
    by: ["playerId"],
    where: { eventId, groupLetter, playerId: { in: activePlayerIds } },
    _sum: { finalPoints: true },
    orderBy: { _sum: { finalPoints: "desc" } },
  });

  const standings = logs.map((l) => ({
    name: playerMap[l.playerId] ?? "?",
    pts: l._sum.finalPoints ?? 0,
  }));

  const matches = await prisma.match.findMany({
    where: { eventId, groupLetter },
    orderBy: { matchNumber: "asc" },
    select: {
      matchNumber: true,
      teamA: true,
      teamB: true,
      finalScoreA: true,
      finalScoreB: true,
      status: true,
      matchDate: true,
    },
  });

  return Response.json({ standings, matches });
}
