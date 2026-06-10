import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Calendar, Users, Zap, Trophy } from "lucide-react";
import PredictorClient, { MatchTab, ParticipantRow } from "./PredictorClient";

const EVENT_ID = "wc2026";
export const revalidate = 30;

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#f97316", C: "#eab308", D: "#22c55e",
  E: "#14b8a6", F: "#3b82f6", G: "#8b5cf6", H: "#ec4899",
  I: "#6366f1", J: "#f59e0b", K: "#10b981", L: "#64748b",
};

function formatJerusalemLabel(d: Date): string {
  const datePart = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${datePart} • ${timePart}`;
}

type GroupStanding = {
  rank: number;
  playerId: string;
  playerName: string;
  playerEmail: string;
  points: number;
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const currentEmail = session.user.email;

  const now = new Date();
  now.setDate(now.getDate() + 7)
  const WINDOW_MS = 105 * 60 * 1000; // 90 min game + 15 min buffer

  // 1. Find all matches in the active window (started ≤ now ≤ start + 105 min)
  let currentMatches = await prisma.match.findMany({
    where: {
      eventId: EVENT_ID,
      matchDate: {
        gte: new Date(now.getTime() - WINDOW_MS),
        lte: now,
      },
    },
    orderBy: { matchNumber: "asc" },
  });

  // 2. If none active, find the next time slot and all matches in it
  if (currentMatches.length === 0) {
    const nextSlot = await prisma.match.findFirst({
      where: { eventId: EVENT_ID, matchDate: { gt: now } },
      orderBy: { matchDate: "asc" },
      select: { matchDate: true },
    });

    if (!nextSlot?.matchDate) {
      return (
        <div className="text-center py-20 text-gray-400">
          <Trophy size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-white">כל המשחקים הסתיימו</p>
          <p className="text-sm mt-1">אין משחקים מתוכננים</p>
        </div>
      );
    }

    currentMatches = await prisma.match.findMany({
      where: { eventId: EVENT_ID, matchDate: nextSlot.matchDate },
      orderBy: { matchNumber: "asc" },
    });
  }

  // 3. Shared data (same for all matches)
  const [playerBets, multiplierData] = await Promise.all([
    prisma.playerBet.findMany({
      where: { eventId: EVENT_ID, status: "locked" },
      include: { player: true },
    }),
    prisma.multiplierGame.findFirst({ where: { eventId: EVENT_ID } }),
  ]);

  const unionMatchNumbers: number[] = multiplierData
    ? (JSON.parse(multiplierData.matchNumbers || "[]") as number[])
    : [];

  const playerNameMap = new Map(playerBets.map((b) => [b.playerId, b.player]));

  // 4. Per-group data (deduplicated — multiple games may share the same group)
  const uniqueGroups = [...new Set(currentMatches.map((m) => m.groupLetter))];

  const groupDataMap = new Map<
    string,
    { completedCount: number; standings: GroupStanding[] }
  >();

  for (const letter of uniqueGroups) {
    const completedIds = await prisma.match
      .findMany({
        where: { eventId: EVENT_ID, groupLetter: letter, status: "completed" },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));

    const logs =
      completedIds.length > 0
        ? await prisma.pointLog.groupBy({
            by: ["playerId"],
            where: { eventId: EVENT_ID, matchId: { in: completedIds } },
            _sum: { finalPoints: true },
            orderBy: { _sum: { finalPoints: "desc" } },
          })
        : [];

    const standings: GroupStanding[] = logs.map((log, i) => ({
      rank: i + 1,
      playerId: log.playerId,
      playerName: playerNameMap.get(log.playerId)?.name ?? "?",
      playerEmail: playerNameMap.get(log.playerId)?.email ?? "",
      points: log._sum.finalPoints ?? 0,
    }));

    groupDataMap.set(letter, { completedCount: completedIds.length, standings });
  }

  // 5. Build per-match predictor tabs
  const predictorTabs: MatchTab[] = currentMatches.map((match) => {
    const { standings } = groupDataMap.get(match.groupLetter)!;
    const baseRank = standings.length + 1;

    const participants: ParticipantRow[] = playerBets.map((bet) => {
      const preds = JSON.parse(bet.groupPredictions || "{}") as Record<string, { a: number; b: number }>;
      const pred = preds[match.matchNumber.toString()] ?? null;
      const standing = standings.find((s) => s.playerId === bet.playerId);

      return {
        playerId: bet.playerId,
        playerName: bet.player.name,
        isCurrentUser: bet.player.email === currentEmail,
        prediction: pred,
        isPersonalMultiplier: unionMatchNumbers.includes(match.matchNumber),
        currentGroupPoints: standing?.points ?? 0,
      };
    });

    const currentRankings = [
      ...standings.map((s) => ({ playerId: s.playerId, rank: s.rank })),
      ...participants
        .filter((p) => !standings.find((s) => s.playerId === p.playerId))
        .map((p) => ({ playerId: p.playerId, rank: baseRank })),
    ];

    return {
      matchId: match.id,
      teamA: match.teamA,
      teamB: match.teamB,
      participants,
      currentRankings,
    };
  });

  const sharedDate = currentMatches[0].matchDate;

  return (
    <div className="space-y-6">
      {/* ── Section 1: Match cards ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-blue-400" />
          <h2 className="font-semibold text-white">
            {currentMatches.length > 1 ? `${currentMatches.length} משחקים בו-זמנית` : "המשחק הבא"}
          </h2>
          {sharedDate && (
            <span className="text-xs text-gray-400">{formatJerusalemLabel(sharedDate)}</span>
          )}
        </div>

        <div className={`grid gap-4 ${currentMatches.length > 1 ? "md:grid-cols-2" : ""}`}>
          {currentMatches.map((match) => {
            const groupColor = GROUP_COLORS[match.groupLetter] ?? "#6b7280";
            const isUnionMultiplier = unionMatchNumbers.includes(match.matchNumber);

            const matchBetRows = playerBets
              .map((bet) => {
                const preds = JSON.parse(bet.groupPredictions || "{}") as Record<string, { a: number; b: number }>;
                const pred = preds[match.matchNumber.toString()] ?? null;
                const isMe = bet.player.email === currentEmail;
                return { bet, pred, isMe, isPersonalMul: unionMatchNumbers.includes(match.matchNumber) };
              })
              .sort((a, b) => (b.isMe ? 1 : 0) - (a.isMe ? 1 : 0));

            return (
              <div key={match.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: groupColor + "33", color: groupColor }}
                  >
                    בית {match.groupLetter}
                  </span>
                  <span className="text-xs text-gray-500">משחק #{match.matchNumber}</span>
                  {isUnionMultiplier && (
                    <span className="mr-auto flex items-center gap-1 text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">
                      <Zap size={10} fill="currentColor" />
                      מכפיל
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold text-white">{match.teamA}</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-500 shrink-0">VS</div>
                    <div className="text-center flex-1">
                      <div className="text-lg font-bold text-white">{match.teamB}</div>
                    </div>
                  </div>

                  {matchBetRows.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-3">אין הימורים נעולים עדיין</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                            <th className="text-right px-3 py-2">שחקן</th>
                            <th className="text-center px-3 py-2">תחזית</th>
                            <th className="text-center px-3 py-2">מכפיל</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchBetRows.map(({ bet, pred, isMe, isPersonalMul }) => (
                            <tr
                              key={bet.id}
                              className={`border-b border-gray-800/50 transition-colors ${
                                isMe ? "bg-green-900/20" : "hover:bg-gray-800/30"
                              }`}
                            >
                              <td className="px-3 py-2 font-medium text-white">
                                {bet.player.name}
                                {isMe && <span className="mr-2 text-xs text-green-400">(אני)</span>}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-gray-200">
                                {pred ? `${pred.a} – ${pred.b}` : <span className="text-gray-600">—</span>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {isPersonalMul ? (
                                  <span className="inline-flex items-center justify-center gap-1 text-yellow-400 text-xs">
                                    <Zap size={12} fill="currentColor" />
                                    כן
                                  </span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Group standings (one per unique group) ─────────── */}
      <div className={`grid gap-4 ${uniqueGroups.length > 1 ? "md:grid-cols-2" : ""}`}>
        {uniqueGroups.map((letter) => {
          const groupColor = GROUP_COLORS[letter] ?? "#6b7280";
          const { completedCount, standings } = groupDataMap.get(letter)!;

          return (
            <div
              key={letter}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
              style={{ borderTopColor: groupColor, borderTopWidth: 3 }}
            >
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <Users size={16} style={{ color: groupColor }} />
                <h2 className="font-semibold text-white">טבלת בית {letter} — עד כה</h2>
                <span className="mr-auto text-xs text-gray-500">{completedCount} משחקים הושלמו</span>
              </div>

              {completedCount === 0 ? (
                <p className="px-4 py-6 text-center text-gray-500 text-sm">
                  אין משחקים שהושלמו בבית {letter} עדיין
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                        <th className="text-right px-4 py-3 w-10">#</th>
                        <th className="text-right px-4 py-3">שחקן</th>
                        <th className="text-right px-4 py-3">נקודות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s) => {
                        const isMe = s.playerEmail === currentEmail;
                        return (
                          <tr
                            key={s.playerId}
                            className={`border-b border-gray-800/50 transition-colors ${
                              isMe ? "bg-green-900/20" : "hover:bg-gray-800/30"
                            }`}
                          >
                            <td className="px-4 py-2.5 text-gray-400 font-mono">{s.rank}</td>
                            <td className="px-4 py-2.5 font-medium text-white">
                              {s.playerName}
                              {isMe && <span className="mr-2 text-xs text-green-400">(אני)</span>}
                            </td>
                            <td className="px-4 py-2.5 text-lg font-bold text-white">{s.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Section 3: Predictor ──────────────────────────────────────── */}
      {playerBets.length > 0 && <PredictorClient matches={predictorTabs} />}
    </div>
  );
}
