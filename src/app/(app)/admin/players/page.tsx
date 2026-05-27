import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CheckCircle, Clock } from "lucide-react";

const EVENT_ID = "wc2026";

export default async function AdminPlayersPage() {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  if (!isAdmin) redirect("/leaderboard");

  const players = await prisma.player.findMany({
    where: { eventId: EVENT_ID },
    include: {
      playerBet: {
        select: {
          status: true,
          kingOfGoalsPlayer: true,
          tournamentWinner: true,
          totalPoints: true,
          multiplierGames: true,
        },
      },
    },
    orderBy: { totalPoints: "desc" },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">ניהול שחקנים</h1>
      <p className="text-gray-400 text-sm">{players.length} שחקנים רשומים</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-right px-4 py-3">#</th>
                <th className="text-right px-4 py-3">שם</th>
                <th className="text-right px-4 py-3">אימייל</th>
                <th className="text-right px-4 py-3">מלך השערים</th>
                <th className="text-right px-4 py-3">זוכה</th>
                <th className="text-right px-4 py-3">מכפילים</th>
                <th className="text-right px-4 py-3">נקודות</th>
                <th className="text-right px-4 py-3">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => {
                const muls: number[] = p.playerBet
                  ? JSON.parse(p.playerBet.multiplierGames || "[]")
                  : [];
                return (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-gray-400">{p.email}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {p.playerBet?.kingOfGoalsPlayer || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {p.playerBet?.tournamentWinner || "—"}
                    </td>
                    <td className="px-4 py-3 text-yellow-400 text-xs">
                      {muls.length > 0 ? muls.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{p.totalPoints}</td>
                    <td className="px-4 py-3">
                      {p.playerBet?.status === "locked" ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle size={12} /> נעול
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                          <Clock size={12} /> טיוטה
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {players.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    אין שחקנים רשומים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
