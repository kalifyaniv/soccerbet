import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckCircle, Clock, Zap } from "lucide-react";

const EVENT_ID = "wc2026";
export const revalidate = 60;

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#f97316", C: "#eab308", D: "#22c55e",
  E: "#14b8a6", F: "#3b82f6", G: "#8b5cf6", H: "#ec4899",
  I: "#6366f1", J: "#f59e0b", K: "#10b981", L: "#64748b",
};

export default async function ResultsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const player = await prisma.player.findUnique({
    where: { eventId_email: { eventId: EVENT_ID, email: session.user.email } },
    include: { playerBet: true },
  });

  const matches = await prisma.match.findMany({
    where: { eventId: EVENT_ID },
    orderBy: { matchNumber: "asc" },
  });

  const pointsLogs = player
    ? await prisma.pointLog.findMany({
        where: { playerId: player.id, eventId: EVENT_ID },
      })
    : [];

  const logsMap = new Map(pointsLogs.map((l) => [l.matchNumber, l]));
  const predictions: Record<string, { a: number; b: number }> = player?.playerBet
    ? JSON.parse(player.playerBet.groupPredictions || "{}")
    : {};
  const multipliers: number[] = player?.playerBet
    ? JSON.parse(player.playerBet.multiplierGames || "[]")
    : [];

  const groups = [...new Set(matches.map((m) => m.groupLetter))].sort();
  const completedCount = matches.filter((m) => m.status === "completed").length;
  const totalPts = pointsLogs.reduce((s, l) => s + l.finalPoints, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">תוצאות משחקים</h1>
          <p className="text-gray-400 text-sm mt-1">
            {completedCount}/72 הושלמו
          </p>
        </div>
        {player && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
            <div className="text-xs text-gray-500">הנקודות שלי עד כה</div>
            <div className="text-2xl font-bold text-green-400">{totalPts}</div>
          </div>
        )}
      </div>

      {groups.map((g) => {
        const groupMatches = matches.filter((m) => m.groupLetter === g);
        const groupPts = groupMatches.reduce(
          (s, m) => s + (logsMap.get(m.matchNumber)?.finalPoints ?? 0),
          0
        );
        return (
          <div key={g} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-gray-800"
              style={{ borderLeftColor: GROUP_COLORS[g], borderLeftWidth: 3 }}
            >
              <span className="font-semibold text-sm" style={{ color: GROUP_COLORS[g] }}>
                בית {g}
              </span>
              {player && (
                <span className="text-xs text-gray-400">
                  {groupPts} נקודות בקבוצה
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-800">
              {groupMatches.map((m) => {
                const pred = predictions[m.matchNumber.toString()];
                const log = logsMap.get(m.matchNumber);
                const isMul = multipliers.includes(m.matchNumber);
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="text-gray-500 text-xs w-6 shrink-0">#{m.matchNumber}</span>

                    {/* Teams */}
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-200">{m.teamA}</span>
                      <span className="text-gray-500 mx-2">vs</span>
                      <span className="text-gray-200">{m.teamB}</span>
                    </div>

                    {/* My prediction */}
                    <div className="text-center w-16">
                      {pred ? (
                        <span className="font-mono text-gray-400">{pred.a}–{pred.b}</span>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </div>

                    {/* Result */}
                    <div className="text-center w-16">
                      {m.status === "completed" && m.finalScoreA != null ? (
                        <span className="font-mono font-bold text-white">{m.finalScoreA}–{m.finalScoreB}</span>
                      ) : m.status === "live" ? (
                        <span className="text-red-400 animate-pulse">LIVE</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </div>

                    {/* Points */}
                    <div className="w-16 text-left">
                      {log ? (
                        <PointsBadge
                          points={log.finalPoints}
                          method={log.scoringMethod ?? ""}
                          isMultiplier={log.isMultiplier}
                        />
                      ) : isMul ? (
                        <span className="text-yellow-600 text-xs">⭐ מכפיל</span>
                      ) : null}
                    </div>

                    {/* Status icon */}
                    <div className="w-5 shrink-0">
                      {m.status === "completed" ? (
                        <CheckCircle size={14} className="text-green-500" />
                      ) : (
                        <Clock size={14} className="text-gray-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PointsBadge({
  points,
  method,
  isMultiplier,
}: {
  points: number;
  method: string;
  isMultiplier: boolean;
}) {
  const color =
    points === 14 || points === 7
      ? "text-yellow-400"
      : points >= 6
      ? "text-green-400"
      : points >= 3
      ? "text-blue-400"
      : points > 0
      ? "text-gray-400"
      : "text-red-500";

  const label =
    method === "exact"
      ? "מדויק"
      : method === "trend_and_gap"
      ? "כיוון+פער"
      : method === "winner_or_gap"
      ? "כיוון/פער"
      : "שגוי";

  return (
    <div className={`font-bold ${color} flex items-center gap-0.5`}>
      {isMultiplier && <Zap size={11} />}
      <span>{points}</span>
      <span className="text-xs text-gray-500 font-normal mr-0.5">({label})</span>
    </div>
  );
}
