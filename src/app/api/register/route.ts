import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, eventId } = await req.json();

    if (!name || !email || !password || !eventId) {
      return Response.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return Response.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, password: hash, role: "player" },
      });

      // Check player doesn't already exist for this event
      const existingPlayer = await tx.player.findUnique({
        where: { eventId_email: { eventId, email } },
      });
      if (existingPlayer) throw new Error("Player already registered for event");

      const player = await tx.player.create({
        data: { userId: user.id, eventId, name, email },
      });

      // Update event player count & prize pool
      await tx.event.update({
        where: { id: eventId },
        data: {
          totalPlayers: { increment: 1 },
        },
      });

      // Create empty draft bet
      await tx.playerBet.create({
        data: {
          playerId: player.id,
          eventId,
          groupPredictions: "{}",
          multiplierGames: "[]",
        },
      });

      // Create bonus log entry
      await tx.bonusLog.create({
        data: { playerId: player.id, eventId },
      });

      return { user, player };
    });

    return Response.json(
      { message: "Registered successfully", playerId: result.player.id },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
