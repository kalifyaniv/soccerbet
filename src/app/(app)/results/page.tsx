import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ResultsClient, { MatchRow } from "@/components/ResultsClient";

const EVENT_ID = "wc2026";
export const revalidate = 60;

function formatJerusalemLabel(d: Date): string {
  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "short",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${datePart} • ${timePart}`;
}

export default async function ResultsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentEmail = session.user.email;

  const [matches, allPlayers, allPointLogs, currentPlayer] = await Promise.all([
    prisma.match.findMany({ where: { eventId: EVENT_ID }, orderBy: { matchNumber: "asc" } }),
    prisma.player.findMany({
      where: { eventId: EVENT_ID, user: { disabled: false } },
      include: { playerBet: true },
      orderBy: { name: "asc" },
    }),
    prisma.pointLog.findMany({ where: { eventId: EVENT_ID } }),
    prisma.player.findUnique({
      where: { eventId_email: { eventId: EVENT_ID, email: currentEmail } },
      include: { playerBet: true },
    }),
  ]);

  // Current player's bets
  const myPredictions: Record<string, { a: number; b: number }> = currentPlayer?.playerBet
    ? JSON.parse(currentPlayer.playerBet.groupPredictions || "{}")
    : {};
  const myMultipliers: number[] = currentPlayer?.playerBet
    ? JSON.parse(currentPlayer.playerBet.multiplierGames || "[]")
    : [];

  // All logs keyed by "playerId-matchNumber" for fast lookup
  const allLogsMap = new Map(allPointLogs.map((l) => [`${l.playerId}-${l.matchNumber}`, l]));
  // My logs keyed by matchNumber
  const myLogsMap = new Map(
    allPointLogs
      .filter((l) => l.playerId === currentPlayer?.id)
      .map((l) => [l.matchNumber, l])
  );

  const completedCount = matches.filter((m) => m.status === "completed").length;
  const totalPts = allPointLogs
    .filter((l) => l.playerId === currentPlayer?.id)
    .reduce((s, l) => s + l.finalPoints, 0);

  const matchRows: MatchRow[] = matches.map((m) => {
    const myPred = myPredictions[m.matchNumber.toString()] ?? null;
    const myLog = myLogsMap.get(m.matchNumber) ?? null;

    // Every player's bet for this match
    const participantBets = allPlayers
      .filter((p) => p.playerBet)
      .map((p) => {
        const pPreds = JSON.parse(p.playerBet!.groupPredictions || "{}");
        const pMuls: number[] = JSON.parse(p.playerBet!.multiplierGames || "[]");
        const pPred = pPreds[m.matchNumber.toString()];
        const pLog = allLogsMap.get(`${p.id}-${m.matchNumber}`) ?? null;
        return {
          playerName: p.name,
          isMe: p.email === currentEmail,
          predA: pPred?.a ?? null,
          predB: pPred?.b ?? null,
          points: pLog?.finalPoints ?? null,
          method: pLog?.scoringMethod ?? null,
          isMultiplier: pMuls.includes(m.matchNumber),
        };
      })
      // "me" first, then alphabetical
      .sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0));

    return {
      id: m.id,
      matchNumber: m.matchNumber,
      groupLetter: m.groupLetter,
      teamA: m.teamA,
      teamB: m.teamB,
      matchDate: m.matchDate?.toISOString() ?? null,
      matchDateLabel: m.matchDate ? formatJerusalemLabel(m.matchDate) : null,
      status: m.status,
      finalScoreA: m.finalScoreA,
      finalScoreB: m.finalScoreB,
      myPred: myPred ? { a: myPred.a, b: myPred.b } : null,
      myPoints: myLog?.finalPoints ?? null,
      myMethod: myLog?.scoringMethod ?? null,
      isMyMultiplier: myMultipliers.includes(m.matchNumber),
      participantBets,
    };
  });

  return (
    <ResultsClient
      matches={matchRows}
      totalPts={totalPts}
      hasPlayer={!!currentPlayer}
      completedCount={completedCount}
    />
  );
}
