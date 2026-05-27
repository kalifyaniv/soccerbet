import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/events – list all events
export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { startDate: "desc" },
  });
  return Response.json({ events });
}

// POST /api/events – create event (admin only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { eventName, description, startDate, endDate, groupStageEnd, bettingDeadline, entryFee } =
    body;

  if (!eventName || !startDate || !endDate || !groupStageEnd || !bettingDeadline) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      eventName,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      groupStageEnd: new Date(groupStageEnd),
      bettingDeadline: new Date(bettingDeadline),
      entryFee: entryFee ?? 200,
      status: "draft",
    },
  });

  return Response.json({ event }, { status: 201 });
}
