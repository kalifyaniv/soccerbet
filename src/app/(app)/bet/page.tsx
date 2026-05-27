import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BettingForm from "@/components/betting/BettingForm";

const EVENT_ID = "wc2026";

export default async function BetPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const event = await prisma.event.findUnique({ where: { id: EVENT_ID } });
  if (!event) return <div>אירוע לא נמצא</div>;

  const player = await prisma.player.findUnique({
    where: { eventId_email: { eventId: EVENT_ID, email: session.user.email } },
    include: { playerBet: true },
  });

  if (!player) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">לא נמצאת כמשתתף בתחרות.</p>
        <p className="text-gray-500 mt-2">
          פנה למנהל כדי להצטרף.
        </p>
      </div>
    );
  }

  const matches = await prisma.match.findMany({
    where: { eventId: EVENT_ID },
    orderBy: { matchNumber: "asc" },
  });

  const isBettingOpen = new Date() < new Date(event.bettingDeadline);
  const existingBet = player.playerBet;

  return (
    <BettingForm
      eventId={EVENT_ID}
      bettingDeadline={event.bettingDeadline.toISOString()}
      isBettingOpen={isBettingOpen}
      matches={matches.map((m) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        groupLetter: m.groupLetter,
        teamA: m.teamA,
        teamB: m.teamB,
        matchDate: m.matchDate?.toISOString() ?? null,
        venue: m.venue,
      }))}
      existingBet={
        existingBet
          ? {
              status: existingBet.status,
              groupPredictions: existingBet.groupPredictions,
              multiplierGames: existingBet.multiplierGames,
              kingOfGoalsPlayer: existingBet.kingOfGoalsPlayer,
              tournamentWinner: existingBet.tournamentWinner,
            }
          : null
      }
    />
  );
}
