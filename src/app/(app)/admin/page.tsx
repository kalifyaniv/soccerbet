import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Settings, ListChecks, DollarSign, Users } from "lucide-react";

const EVENT_ID = "wc2026";

export default async function AdminDashboard() {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  if (!isAdmin) redirect("/leaderboard");

  const event = await prisma.event.findUnique({ where: { id: EVENT_ID } });
  const totalPlayers = await prisma.player.count({ where: { eventId: EVENT_ID } });
  const lockedBets = await prisma.playerBet.count({ where: { eventId: EVENT_ID, status: "locked" } });
  const completedMatches = await prisma.match.count({ where: { eventId: EVENT_ID, status: "completed" } });
  const pendingMatches = await prisma.match.count({ where: { eventId: EVENT_ID, status: "scheduled" } });

  const mg = await prisma.multiplierGame.findUnique({ where: { eventId: EVENT_ID } });
  const multiplierGames: number[] = mg ? JSON.parse(mg.matchNumbers) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="text-gray-400" />
        לוח ניהול
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="משתתפים" value={totalPlayers} color="blue" />
        <StatCard icon={<ListChecks size={20} />} label="הימורים נעולים" value={lockedBets} color="green" />
        <StatCard icon={<ListChecks size={20} />} label="משחקים הושלמו" value={completedMatches} color="yellow" />
        <StatCard icon={<DollarSign size={20} />} label="קופת פרסים" value={`₪${event?.totalPrizePool ?? 0}`} color="purple" />
      </div>

      {/* Multiplier games */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3">⭐ משחקי מכפיל (UNION)</h3>
        {multiplierGames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {multiplierGames.map((n) => (
              <span key={n} className="text-sm bg-yellow-900/30 border border-yellow-700/40 text-yellow-300 px-2.5 py-1 rounded-full">
                משחק #{n}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">אין עדיין הימורים נעולים</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          {mg?.totalMultiplierGames ?? 0} משחקים ייחודיים • {mg?.duplicateCount ?? 0} כפילויות
        </p>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <AdminLink
          href="/admin/results"
          icon={<ListChecks size={24} />}
          title="הזנת תוצאות"
          desc={`${pendingMatches} משחקים ממתינים`}
          color="green"
        />
        <AdminLink
          href="/admin/players"
          icon={<Users size={24} />}
          title="ניהול שחקנים"
          desc={`${totalPlayers} שחקנים רשומים`}
          color="blue"
        />
        <AdminLink
          href="/admin/payout"
          icon={<DollarSign size={24} />}
          title="דוח תשלומים"
          desc={`קופה: ₪${event?.totalPrizePool ?? 0}`}
          color="purple"
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "blue" | "green" | "yellow" | "purple";
}) {
  const colors = {
    blue: "text-blue-400 bg-blue-900/20 border-blue-800",
    green: "text-green-400 bg-green-900/20 border-green-800",
    yellow: "text-yellow-400 bg-yellow-900/20 border-yellow-800",
    purple: "text-purple-400 bg-purple-900/20 border-purple-800",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="opacity-70 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm opacity-70 mt-0.5">{label}</div>
    </div>
  );
}

function AdminLink({ href, icon, title, desc, color }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: "green" | "blue" | "purple";
}) {
  const colors = {
    green: "border-green-800 hover:border-green-600 hover:bg-green-900/10",
    blue: "border-blue-800 hover:border-blue-600 hover:bg-blue-900/10",
    purple: "border-purple-800 hover:border-purple-600 hover:bg-purple-900/10",
  };
  return (
    <Link href={href} className={`bg-gray-900 border rounded-xl p-5 transition-all ${colors[color]} group`}>
      <div className="text-gray-400 group-hover:text-white transition-colors mb-3">{icon}</div>
      <div className="font-semibold text-white">{title}</div>
      <div className="text-sm text-gray-500 mt-1">{desc}</div>
    </Link>
  );
}
