import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PlayersTable from "./PlayersTable";

const EVENT_ID = "wc2026";

export default async function AdminPlayersPage() {
  const session = await auth();
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  if (!isAdmin) redirect("/leaderboard");

  const players = await prisma.player.findMany({
    where: { eventId: EVENT_ID },
    include: {
      user: { select: { id: true, disabled: true } },
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

  const rows = players.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    totalPoints: p.totalPoints,
    userId: p.user?.id ?? null,
    userDisabled: p.user?.disabled ?? false,
    betStatus: p.playerBet?.status ?? null,
    kingOfGoalsPlayer: p.playerBet?.kingOfGoalsPlayer ?? null,
    tournamentWinner: p.playerBet?.tournamentWinner ?? null,
    multiplierGames: p.playerBet
      ? (JSON.parse(p.playerBet.multiplierGames || "[]") as number[])
      : [],
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">ניהול שחקנים</h1>
      <PlayersTable initialPlayers={rows} />
    </div>
  );
}
