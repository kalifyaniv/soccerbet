import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EVENT_ID = "wc2026";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const matches = await prisma.match.findMany({
    where: { eventId: EVENT_ID },
    select: { matchNumber: true, groupLetter: true, teamA: true, teamB: true },
  });
  const matchMap = new Map(matches.map((m) => [m.matchNumber, m]));

  const bets = await prisma.playerBet.findMany({
    where: { eventId: EVENT_ID },
    include: {
      player: { select: { userId: true, name: true } },
    },
    orderBy: { player: { name: "asc" } },
  });

  const rows: string[] = ["userid,user name,game number,group,team A,team B,result"];

  for (const bet of bets) {
    const userId = bet.player.userId ?? "";
    const userName = bet.player.name;

    let predictions: Record<string, { a: number; b: number }> = {};
    try {
      predictions = JSON.parse(bet.groupPredictions);
    } catch {
      continue;
    }

    const matchNumbers = Object.keys(predictions)
      .map(Number)
      .sort((a, b) => a - b);

    for (const matchNum of matchNumbers) {
      const match = matchMap.get(matchNum);
      if (!match) continue;

      const pred = predictions[String(matchNum)];
      const result = `${pred.a}-${pred.b}`;

      rows.push(
        [
          csvEscape(userId),
          csvEscape(userName),
          matchNum,
          csvEscape(match.groupLetter),
          csvEscape(match.teamA),
          csvEscape(match.teamB),
          result,
        ].join(",")
      );
    }
  }

  const csv = rows.join("\n");
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bets-export-${date}.csv"`,
    },
  });
}
