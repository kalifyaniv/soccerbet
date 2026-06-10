import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EVENT_ID = "wc2026";

// PATCH /api/admin/users/[userId]/disable — toggle disabled flag
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const { userId } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const nowDisabled = !user.disabled;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { disabled: nowDisabled },
    });

    // Adjust the event participant count
    const player = await tx.player.findFirst({
      where: { userId, eventId: EVENT_ID },
    });
    if (player) {
      await tx.event.update({
        where: { id: EVENT_ID },
        data: { totalPlayers: { increment: nowDisabled ? -1 : 1 } },
      });
    }
  });

  return Response.json({ disabled: nowDisabled });
}
