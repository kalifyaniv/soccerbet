"use client";

import { useState } from "react";
import { CheckCircle, Clock, Ban, RotateCcw } from "lucide-react";

interface PlayerRow {
  id: string;
  name: string;
  email: string;
  totalPoints: number;
  userId: string | null;
  userDisabled: boolean;
  betStatus: string | null;
  kingOfGoalsPlayer: string | null;
  tournamentWinner: string | null;
  multiplierGames: number[];
}

export default function PlayersTable({ initialPlayers }: { initialPlayers: PlayerRow[] }) {
  const [players, setPlayers] = useState(initialPlayers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleDisable(userId: string, playerId: string) {
    setLoadingId(playerId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/disable`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      const { disabled } = await res.json();
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, userDisabled: disabled } : p))
      );
    } finally {
      setLoadingId(null);
    }
  }

  const active = players.filter((p) => !p.userDisabled);
  const total = players.length;

  return (
    <>
      <p className="text-gray-400 text-sm">
        {active.length} שחקנים פעילים ({total} סה&quot;כ)
      </p>

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
                <th className="text-right px-4 py-3">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`border-b border-gray-800/50 ${
                    p.userDisabled ? "opacity-40" : "hover:bg-gray-800/30"
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-white">
                    <span className="flex items-center gap-2">
                      {p.name}
                      {p.userDisabled && (
                        <span className="text-xs bg-red-900/60 text-red-400 border border-red-800 px-1.5 py-0.5 rounded">
                          מושבת
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{p.email}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    {p.kingOfGoalsPlayer || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    {p.tournamentWinner || "—"}
                  </td>
                  <td className="px-4 py-3 text-yellow-400 text-xs">
                    {p.multiplierGames.length > 0 ? p.multiplierGames.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">{p.totalPoints}</td>
                  <td className="px-4 py-3">
                    {p.betStatus === "locked" ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle size={12} /> נעול
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <Clock size={12} /> טיוטה
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.userId ? (
                      <button
                        onClick={() => toggleDisable(p.userId!, p.id)}
                        disabled={loadingId === p.id}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          p.userDisabled
                            ? "bg-green-900/40 text-green-400 hover:bg-green-900/70 border border-green-800"
                            : "bg-red-900/40 text-red-400 hover:bg-red-900/70 border border-red-800"
                        } disabled:opacity-50`}
                      >
                        {p.userDisabled ? (
                          <><RotateCcw size={11} /> הפעל</>
                        ) : (
                          <><Ban size={11} /> השבת</>
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    אין שחקנים רשומים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
