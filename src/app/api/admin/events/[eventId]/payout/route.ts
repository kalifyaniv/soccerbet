import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export interface PayoutEntry {
  category: string;
  winnerName: string | null;
  amount: number;
}

// GET /api/admin/events/[eventId]/payout
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const { eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  const pool = event.totalPlayers * event.entryFee;
  const payouts: PayoutEntry[] = [];

  // ── Per-בית winners (5% each) ──────────────────────────────────────────
  // Winner of בית X = player with highest sum(finalPoints) on matches where groupLetter = X
  for (const letter of GROUP_LETTERS) {
    // Sum points per player for matches in this WC group
    const logs = await prisma.pointLog.groupBy({
      by: ["playerId"],
      where: { eventId, groupLetter: letter },
      _sum: { finalPoints: true },
      orderBy: { _sum: { finalPoints: "desc" } },
    });

    if (logs.length === 0) {
      payouts.push({ category: `בית ${letter}`, winnerName: null, amount: Math.round(pool * 0.05 * 100) / 100 });
      continue;
    }

    const topScore = logs[0]._sum.finalPoints ?? 0;
    const tied = logs.filter((l) => (l._sum.finalPoints ?? 0) === topScore);

    // Fetch player names
    const winnerPlayers = await prisma.player.findMany({
      where: { id: { in: tied.map((t) => t.playerId) } },
      select: { name: true },
    });

    const names = winnerPlayers.map((p) => p.name).join(", ");
    const splitAmount = Math.round((pool * 0.05 * 100) / tied.length) / 100;

    payouts.push({
      category: `בית ${letter}`,
      winnerName: names,
      amount: splitAmount,
    });
  }

  // ── Overall top scorer (20%) ─────────────────────────────────────────────
  const allPlayers = await prisma.player.findMany({
    where: { eventId },
    orderBy: { totalPoints: "desc" },
    select: { name: true, totalPoints: true },
  });

  if (allPlayers.length > 0) {
    const topTotal = allPlayers[0].totalPoints;
    const overallTied = allPlayers.filter((p) => p.totalPoints === topTotal);
    const overallNames = overallTied.map((p) => p.name).join(", ");
    const overallSplit = Math.round((pool * 0.2 * 100) / overallTied.length) / 100;
    payouts.push({ category: "ניקוד כולל", winnerName: overallNames, amount: overallSplit });
  } else {
    payouts.push({ category: "ניקוד כולל", winnerName: null, amount: Math.round(pool * 0.2 * 100) / 100 });
  }

  // ── King of Goals (10%) ──────────────────────────────────────────────────
  const kogWinners = await prisma.bonusLog.findMany({
    where: { eventId, kingOfGoalsPoints: 10 },
    include: { player: { select: { name: true } } },
  });
  const kogNames = kogWinners.length > 0 ? kogWinners.map((w) => w.player.name).join(", ") : null;
  const kogSplit = kogWinners.length > 1
    ? Math.round((pool * 0.1 * 100) / kogWinners.length) / 100
    : Math.round(pool * 0.1 * 100) / 100;
  payouts.push({ category: "מלך השערים", winnerName: kogNames, amount: kogSplit });

  // ── Tournament winner (10%) ──────────────────────────────────────────────
  const twWinners = await prisma.bonusLog.findMany({
    where: { eventId, tournamentWinnerPoints: 10 },
    include: { player: { select: { name: true } } },
  });
  const twNames = twWinners.length > 0 ? twWinners.map((w) => w.player.name).join(", ") : null;
  const twSplit = twWinners.length > 1
    ? Math.round((pool * 0.1 * 100) / twWinners.length) / 100
    : Math.round(pool * 0.1 * 100) / 100;
  payouts.push({ category: "זוכה הגביע", winnerName: twNames, amount: twSplit });

  const totalDistributed = Math.round(payouts.reduce((s, p) => s + p.amount, 0) * 100) / 100;

  return Response.json({ pool, payouts, totalDistributed, eventName: event.eventName });
}
