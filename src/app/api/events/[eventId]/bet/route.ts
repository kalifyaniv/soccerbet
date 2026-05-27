import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { GroupPredictionsMap } from "@/types";

// GET /api/events/[eventId]/bet – get current user's bet
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { eventId } = await params;

  const player = await prisma.player.findUnique({
    where: { eventId_email: { eventId, email: session.user.email } },
  });
  if (!player) {
    return Response.json({ error: "Player not found for this event" }, { status: 404 });
  }

  const bet = await prisma.playerBet.findUnique({
    where: { playerId: player.id },
  });
  if (!bet) {
    return Response.json({ error: "No bet found" }, { status: 404 });
  }

  return Response.json({
    bet: {
      ...bet,
      groupPredictions: JSON.parse(bet.groupPredictions),
      multiplierGames: JSON.parse(bet.multiplierGames),
    },
  });
}

// POST /api/events/[eventId]/bet – submit & lock bets
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { eventId } = await params;

  // Check betting deadline
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return Response.json({ error: "Event not found" }, { status: 404 });

  if (new Date() > new Date(event.bettingDeadline)) {
    return Response.json(
      {
        error: "BETTING_CLOSED",
        message: `Betting deadline was ${event.bettingDeadline.toISOString()}`,
      },
      { status: 409 }
    );
  }

  const player = await prisma.player.findUnique({
    where: { eventId_email: { eventId, email: session.user.email } },
  });
  if (!player) {
    return Response.json({ error: "Player not found for this event" }, { status: 404 });
  }

  // Check if already locked
  const existingBet = await prisma.playerBet.findUnique({
    where: { playerId: player.id },
  });
  if (existingBet?.status === "locked") {
    return Response.json(
      { error: "BET_ALREADY_LOCKED", message: "Bets already submitted and locked" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const { groupPredictions, multiplierGames, kingOfGoalsPlayer, tournamentWinner } =
    body as {
      groupPredictions: GroupPredictionsMap;
      multiplierGames: number[];
      kingOfGoalsPlayer: string;
      tournamentWinner: string;
    };

  // Validate – all 72 matches filled
  const matchCount = Object.keys(groupPredictions).length;
  if (matchCount !== 72) {
    return Response.json(
      {
        error: "MISSING_PREDICTIONS",
        message: `Expected 72 match predictions, got ${matchCount}`,
      },
      { status: 400 }
    );
  }

  // Validate multipliers = exactly 2
  if (!Array.isArray(multiplierGames) || multiplierGames.length !== 2) {
    return Response.json(
      { error: "INVALID_MULTIPLIER_COUNT", message: "Select exactly 2 multiplier games" },
      { status: 400 }
    );
  }

  if (!kingOfGoalsPlayer?.trim()) {
    return Response.json(
      { error: "MISSING_KING_OF_GOALS", message: "King of Goals prediction required" },
      { status: 400 }
    );
  }

  if (!tournamentWinner?.trim()) {
    return Response.json(
      { error: "MISSING_TOURNAMENT_WINNER", message: "Tournament winner prediction required" },
      { status: 400 }
    );
  }

  // Save & lock
  const bet = await prisma.playerBet.upsert({
    where: { playerId: player.id },
    update: {
      groupPredictions: JSON.stringify(groupPredictions),
      multiplierGames: JSON.stringify(multiplierGames),
      kingOfGoalsPlayer,
      tournamentWinner,
      status: "locked",
      submittedAt: new Date(),
    },
    create: {
      playerId: player.id,
      eventId,
      groupPredictions: JSON.stringify(groupPredictions),
      multiplierGames: JSON.stringify(multiplierGames),
      kingOfGoalsPlayer,
      tournamentWinner,
      status: "locked",
      submittedAt: new Date(),
    },
  });

  // Update bonus log
  await prisma.bonusLog.upsert({
    where: { playerId: player.id },
    update: {
      predictedTopScorer: kingOfGoalsPlayer,
      predictedWinner: tournamentWinner,
    },
    create: {
      playerId: player.id,
      eventId,
      predictedTopScorer: kingOfGoalsPlayer,
      predictedWinner: tournamentWinner,
    },
  });

  // Recalculate multiplier union
  await recalculateMultiplierUnion(eventId);

  return Response.json(
    {
      message: "Bets locked successfully",
      betId: bet.id,
      submittedAt: bet.submittedAt,
    },
    { status: 201 }
  );
}

// PUT /api/events/[eventId]/bet – save draft (before deadline, not locked)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { eventId } = await params;

  const player = await prisma.player.findUnique({
    where: { eventId_email: { eventId, email: session.user.email } },
  });
  if (!player) {
    return Response.json({ error: "Player not found" }, { status: 404 });
  }

  const existingBet = await prisma.playerBet.findUnique({
    where: { playerId: player.id },
  });
  if (existingBet?.status === "locked") {
    return Response.json({ error: "BET_ALREADY_LOCKED" }, { status: 409 });
  }

  const body = await req.json();
  const { groupPredictions, multiplierGames, kingOfGoalsPlayer, tournamentWinner } = body;

  const bet = await prisma.playerBet.upsert({
    where: { playerId: player.id },
    update: {
      groupPredictions: JSON.stringify(groupPredictions ?? {}),
      multiplierGames: JSON.stringify(multiplierGames ?? []),
      kingOfGoalsPlayer: kingOfGoalsPlayer ?? "",
      tournamentWinner: tournamentWinner ?? "",
      status: "draft",
    },
    create: {
      playerId: player.id,
      eventId,
      groupPredictions: JSON.stringify(groupPredictions ?? {}),
      multiplierGames: JSON.stringify(multiplierGames ?? []),
      kingOfGoalsPlayer: kingOfGoalsPlayer ?? "",
      tournamentWinner: tournamentWinner ?? "",
    },
  });

  return Response.json({ message: "Draft saved", betId: bet.id });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function recalculateMultiplierUnion(eventId: string) {
  const bets = await prisma.playerBet.findMany({
    where: { eventId, status: "locked" },
    select: { multiplierGames: true },
  });

  const seen = new Map<number, number>(); // matchNum -> count
  for (const bet of bets) {
    const picks: number[] = JSON.parse(bet.multiplierGames);
    for (const pick of picks) {
      seen.set(pick, (seen.get(pick) ?? 0) + 1);
    }
  }

  const matchNumbers = Array.from(seen.keys()).sort((a, b) => a - b);
  const duplicateCount = Array.from(seen.values()).filter((c) => c > 1).length;

  await prisma.multiplierGame.upsert({
    where: { eventId },
    update: {
      matchNumbers: JSON.stringify(matchNumbers),
      totalMultiplierGames: matchNumbers.length,
      duplicateCount,
      calculatedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      eventId,
      matchNumbers: JSON.stringify(matchNumbers),
      totalMultiplierGames: matchNumbers.length,
      duplicateCount,
      calculatedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}
