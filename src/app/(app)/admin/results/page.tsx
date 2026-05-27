import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminResultsClient from "@/components/admin/AdminResultsClient";

const EVENT_ID = "wc2026";

export default async function AdminResultsPage() {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  if (!isAdmin) redirect("/leaderboard");

  const matches = await prisma.match.findMany({
    where: { eventId: EVENT_ID },
    orderBy: { matchNumber: "asc" },
  });

  const event = await prisma.event.findUnique({ where: { id: EVENT_ID } });

  return (
    <AdminResultsClient
      eventId={EVENT_ID}
      matches={matches.map((m) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        groupLetter: m.groupLetter,
        teamA: m.teamA,
        teamB: m.teamB,
        matchDate: m.matchDate?.toISOString() ?? null,
        status: m.status,
        finalScoreA: m.finalScoreA,
        finalScoreB: m.finalScoreB,
      }))}
      actualTopScorer={event?.actualTopScorer ?? ""}
      actualWinner={event?.actualWinner ?? ""}
    />
  );
}
