import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DollarSign, Trophy } from "lucide-react";

const EVENT_ID = "wc2026";
const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#f97316", C: "#eab308", D: "#22c55e",
  E: "#14b8a6", F: "#3b82f6", G: "#8b5cf6", H: "#ec4899",
  I: "#6366f1", J: "#f59e0b", K: "#10b981", L: "#64748b",
};

export default async function PayoutPage() {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  if (!isAdmin) redirect("/leaderboard");

  const event = await prisma.event.findUnique({ where: { id: EVENT_ID } });
  const pool = (event?.totalPlayers ?? 0) * (event?.entryFee ?? 200);

  // Build payout table server-side (mirrors the API logic)
  const payouts: { category: string; winnerName: string | null; amount: number; pct: string }[] = [];

  // Per-בית winners
  for (const letter of GROUP_LETTERS) {
    const logs = await prisma.pointLog.groupBy({
      by: ["playerId"],
      where: { eventId: EVENT_ID, groupLetter: letter },
      _sum: { finalPoints: true },
      orderBy: { _sum: { finalPoints: "desc" } },
    });

    const topScore = logs[0]?._sum.finalPoints ?? 0;
    const tied = logs.filter((l) => (l._sum.finalPoints ?? 0) === topScore && topScore > 0);

    let names: string | null = null;
    if (tied.length > 0) {
      const winners = await prisma.player.findMany({
        where: { id: { in: tied.map((t) => t.playerId) } },
        select: { name: true },
      });
      names = winners.map((p) => p.name).join(", ");
    }

    const amount = Math.round(pool * 0.05 * 100) / 100;
    payouts.push({ category: `בית ${letter}`, winnerName: names, amount, pct: "5%" });
  }

  // Overall
  const topPlayer = await prisma.player.findFirst({
    where: { eventId: EVENT_ID },
    orderBy: { totalPoints: "desc" },
    select: { name: true, totalPoints: true },
  });
  payouts.push({
    category: "ניקוד כולל",
    winnerName: topPlayer?.name ?? null,
    amount: Math.round(pool * 0.2 * 100) / 100,
    pct: "20%",
  });

  // King of Goals
  const kogWinners = await prisma.bonusLog.findMany({
    where: { eventId: EVENT_ID, kingOfGoalsPoints: 10 },
    include: { player: { select: { name: true } } },
  });
  payouts.push({
    category: "מלך השערים",
    winnerName: kogWinners.length > 0 ? kogWinners.map((w) => w.player.name).join(", ") : null,
    amount: Math.round(pool * 0.1 * 100) / 100,
    pct: "10%",
  });

  // Tournament winner
  const twWinners = await prisma.bonusLog.findMany({
    where: { eventId: EVENT_ID, tournamentWinnerPoints: 10 },
    include: { player: { select: { name: true } } },
  });
  payouts.push({
    category: "זוכה הגביע",
    winnerName: twWinners.length > 0 ? twWinners.map((w) => w.player.name).join(", ") : null,
    amount: Math.round(pool * 0.1 * 100) / 100,
    pct: "10%",
  });

  const total = Math.round(payouts.reduce((s, p) => s + p.amount, 0) * 100) / 100;

  // Players for reference
  const players = await prisma.player.findMany({
    where: { eventId: EVENT_ID },
    orderBy: { totalPoints: "desc" },
    take: 15,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-green-400" />
          דוח תשלומים
        </h1>
        <div className="bg-green-900/20 border border-green-700 rounded-xl px-4 py-2 text-center">
          <div className="text-xs text-gray-400">סה״כ קופה</div>
          <div className="text-2xl font-bold text-green-400">₪{pool.toLocaleString()}</div>
        </div>
      </div>

      {/* Payout table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                <th className="text-right px-4 py-3">קטגוריה</th>
                <th className="text-right px-4 py-3">%</th>
                <th className="text-right px-4 py-3">זוכה</th>
                <th className="text-left px-4 py-3">סכום</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-800/50 ${
                    p.category.startsWith("בית") ? "text-sm" : "font-medium"
                  }`}
                >
                  <td className="px-4 py-2.5 text-gray-300">
                    {p.category.startsWith("בית") ? (
                      <span style={{ color: GROUP_COLORS[p.category.split(" ")[1]] }}>
                        {p.category}
                      </span>
                    ) : (
                      p.category
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{p.pct}</td>
                  <td className="px-4 py-2.5 text-white">
                    {p.winnerName ?? <span className="text-gray-600 font-normal">TBD</span>}
                  </td>
                  <td className="px-4 py-2.5 text-left font-bold text-green-400">
                    ₪{p.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-800/40">
                <td className="px-4 py-3 font-bold text-white" colSpan={3}>סה״כ לחלוקה</td>
                <td className="px-4 py-3 text-left font-bold text-green-300">₪{total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Quick leaderboard */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Trophy size={16} className="text-yellow-400" />
            טבלת ניקוד
          </h3>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                <td className="px-4 py-2.5 text-gray-500 w-8">{i + 1}</td>
                <td className="px-4 py-2.5 text-white font-medium">{p.name}</td>
                <td className="px-4 py-2.5 text-left font-bold text-white">{p.totalPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
