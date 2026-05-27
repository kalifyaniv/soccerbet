import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/events/[eventId]/multiplier
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  const mg = await prisma.multiplierGame.findUnique({ where: { eventId } });
  if (!mg) {
    return Response.json({ matchNumbers: [], totalMultiplierGames: 0 });
  }

  return Response.json({
    matchNumbers: JSON.parse(mg.matchNumbers),
    totalMultiplierGames: mg.totalMultiplierGames,
    duplicateCount: mg.duplicateCount,
    calculatedAt: mg.calculatedAt,
  });
}
