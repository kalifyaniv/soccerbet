import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Trophy, Star, Medal } from "lucide-react";

const EVENT_ID = "wc2026";
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#f97316", C: "#eab308", D: "#22c55e",
  E: "#14b8a6", F: "#3b82f6", G: "#8b5cf6", H: "#ec4899",
  I: "#6366f1", J: "#f59e0b", K: "#10b981", L: "#64748b",
};

export const revalidate = 30;

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const currentEmail = session.user?.email ?? "";

  const players = await prisma.player.findMany({
    where: { eventId: EVENT_ID },
    include: {
      playerBet: {
        select: {
          status: true,
          groupStagePoints: true,
          kingOfGoalsPoints: true,
          tournamentWinnerPoints: true,
          totalPoints: true,
        },
      },
    },
    orderBy: { totalPoints: "desc" },
  });

  const event = await prisma.event.findUnique({ where: { id: EVENT_ID } });
  const matchesCompleted = await prisma.match.count({
    where: { eventId: EVENT_ID, status: "completed" },
  });

  // Per-בית leaders: for each WC group letter, find the player(s) with the most points
  const groupLeaders: Record<string, { name: string; pts: number }[]> = {};
  for (const letter of GROUP_LETTERS) {
    const logs = await prisma.pointLog.groupBy({
      by: ["playerId"],
      where: { eventId: EVENT_ID, groupLetter: letter },
      _sum: { finalPoints: true },
      orderBy: { _sum: { finalPoints: "desc" } },
      take: 3,
    });

    const withNames = await Promise.all(
      logs.map(async (l) => {
        const p = await prisma.player.findUnique({ where: { id: l.playerId }, select: { name: true } });
        return { name: p?.name ?? "?", pts: l._sum.finalPoints ?? 0 };
      })
    );
    groupLeaders[letter] = withNames;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-yellow-400" />
            טבלת הניקוד
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {matchesCompleted} / 72 משחקים הושלמו
          </p>
        </div>
        {event && (
          <div className="text-left bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm">
            <div className="text-gray-400">קופת פרסים</div>
            <div className="text-2xl font-bold text-green-400">
              ₪{(event.totalPrizePool ?? 0).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="משתתפים" value={players.length} />
        <StatCard label="הגישו הימורים" value={players.filter((p) => p.playerBet?.status === "locked").length} />
        <StatCard label="משחקים הושלמו" value={matchesCompleted} />
      </div>

      {/* Overall leaderboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="font-semibold text-white">🏆 דירוג כולל</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-right px-4 py-3 w-10">#</th>
                <th className="text-right px-4 py-3">שם</th>
                <th className="text-right px-4 py-3">שלב הבתים</th>
                <th className="text-right px-4 py-3">מלך השערים</th>
                <th className="text-right px-4 py-3">זוכה</th>
                <th className="text-right px-4 py-3 font-bold">סה״כ</th>
                <th className="text-right px-4 py-3">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => {
                const isMe = player.email === currentEmail;
                return (
                  <tr
                    key={player.id}
                    className={`border-b border-gray-800/50 transition-colors ${
                      isMe ? "bg-green-900/20 border-green-700/30" : "hover:bg-gray-800/30"
                    }`}
                  >
                    <td className="px-4 py-3"><RankBadge rank={idx + 1} /></td>
                    <td className="px-4 py-3 font-medium text-white">
                      {player.name}
                      {isMe && <span className="mr-2 text-xs text-green-400">(אני)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{player.playerBet?.groupStagePoints ?? 0}</td>
                    <td className="px-4 py-3">
                      <PointsBadge points={player.playerBet?.kingOfGoalsPoints} max={10} />
                    </td>
                    <td className="px-4 py-3">
                      <PointsBadge points={player.playerBet?.tournamentWinnerPoints} max={10} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-bold text-white">{player.totalPoints}</span>
                    </td>
                    <td className="px-4 py-3">
                      {player.playerBet?.status === "locked" ? (
                        <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">✓ נעול</span>
                      ) : (
                        <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">טיוטה</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {players.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    אין משתתפים עדיין
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-בית leaders */}
      {matchesCompleted > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Trophy size={16} className="text-yellow-400" />
            מובילי הבתים (5% לכל מנצח)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {GROUP_LETTERS.map((letter) => {
              const leaders = groupLeaders[letter] ?? [];
              const leader = leaders[0];
              return (
                <div
                  key={letter}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-3"
                  style={{ borderTopColor: GROUP_COLORS[letter], borderTopWidth: 2 }}
                >
                  <div className="text-xs font-medium mb-2" style={{ color: GROUP_COLORS[letter] }}>
                    בית {letter}
                  </div>
                  {leader && leader.pts > 0 ? (
                    <>
                      <div className="text-white font-semibold text-sm truncate">{leader.name}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{leader.pts} נקודות</div>
                    </>
                  ) : (
                    <div className="text-gray-600 text-xs">אין תוצאות עדיין</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prize breakdown */}
      {event && <PrizeBreakdown pool={event.totalPrizePool ?? 0} />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="text-yellow-400" size={20} />;
  if (rank === 2) return <Medal className="text-gray-300" size={20} />;
  if (rank === 3) return <Medal className="text-amber-600" size={20} />;
  return <span className="text-gray-400 font-mono">{rank}</span>;
}

function PointsBadge({ points, max }: { points: number | null | undefined; max: number }) {
  if (points == null) return <span className="text-gray-600">—</span>;
  if (points === max)
    return (
      <span className="flex items-center gap-1 text-yellow-400">
        <Star size={12} fill="currentColor" />{points}
      </span>
    );
  return <span className="text-gray-400">{points}</span>;
}

function PrizeBreakdown({ pool }: { pool: number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Trophy size={16} className="text-yellow-400" />
        חלוקת פרסים
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <PrizeItem label="מנצח בית (×12)" value={`₪${Math.round(pool * 0.05)} כל אחד`} pct="5%" color="text-blue-400" />
        <PrizeItem label="ניקוד כולל" value={`₪${Math.round(pool * 0.2)}`} pct="20%" color="text-yellow-400" />
        <PrizeItem label="מלך השערים" value={`₪${Math.round(pool * 0.1)}`} pct="10%" color="text-purple-400" />
        <PrizeItem label="זוכה הגביע" value={`₪${Math.round(pool * 0.1)}`} pct="10%" color="text-green-400" />
      </div>
    </div>
  );
}

function PrizeItem({ label, value, pct, color }: { label: string; value: string; pct: string; color: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className={`text-xs font-medium ${color} mb-1`}>{pct}</div>
      <div className="text-white font-semibold">{value}</div>
      <div className="text-gray-400 text-xs mt-0.5">{label}</div>
    </div>
  );
}
