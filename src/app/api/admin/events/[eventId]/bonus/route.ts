import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/events/[eventId]/bonus
// Set actual top scorer and/or tournament winner. Triggers bonus point calculation.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const { eventId } = await params;
  const { actualTopScorer, actualWinner } = await req.json();

  // Update event record
  await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(actualTopScorer !== undefined && { actualTopScorer }),
      ...(actualWinner !== undefined && { actualWinner }),
    },
  });

  const bonusLogs = await prisma.bonusLog.findMany({ where: { eventId } });

  let updatedKog = 0;
  let updatedTw = 0;

  for (const log of bonusLogs) {
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (actualTopScorer !== undefined) {
      const correct =
        log.predictedTopScorer.trim().toLowerCase() ===
        actualTopScorer.trim().toLowerCase();
      updates.actualTopScorer = actualTopScorer;
      updates.kingOfGoalsPoints = correct ? 10 : 0;
      updates.kingOfGoalsCalculatedAt = new Date();
      if (correct) updatedKog++;
    }

    if (actualWinner !== undefined) {
      const correct =
        log.predictedWinner.trim().toLowerCase() ===
        actualWinner.trim().toLowerCase();
      updates.actualWinner = actualWinner;
      updates.tournamentWinnerPoints = correct ? 10 : 0;
      updates.tournamentWinnerCalculatedAt = new Date();
      if (correct) updatedTw++;
    }

    await prisma.bonusLog.update({ where: { id: log.id }, data: updates });
  }

  // Sync bonus points back to playerBet & player totals
  if (actualTopScorer !== undefined || actualWinner !== undefined) {
    const updatedLogs = await prisma.bonusLog.findMany({ where: { eventId } });

    for (const log of updatedLogs) {
      const kog = log.kingOfGoalsPoints ?? 0;
      const tw = log.tournamentWinnerPoints ?? 0;

      await prisma.playerBet.updateMany({
        where: { playerId: log.playerId },
        data: {
          kingOfGoalsPoints: kog,
          tournamentWinnerPoints: tw,
        },
      });

      // Recalculate total
      const pointsLogs = await prisma.pointLog.findMany({
        where: { playerId: log.playerId, eventId },
      });
      const groupStagePoints = pointsLogs.reduce((s, p) => s + p.finalPoints, 0);
      const total = groupStagePoints + kog + tw;

      await prisma.player.update({
        where: { id: log.playerId },
        data: { totalPoints: total },
      });

      await prisma.playerBet.updateMany({
        where: { playerId: log.playerId },
        data: { totalPoints: total, groupStagePoints },
      });
    }
  }

  return Response.json({
    message: "Bonus results saved",
    kingOfGoalsCorrect: updatedKog,
    tournamentWinnerCorrect: updatedTw,
  });
}
