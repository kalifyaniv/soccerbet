"use client";

import { useEffect, useState } from "react";
import { X, Trophy, Clock, CheckCircle } from "lucide-react";

type Standings = { name: string; pts: number }[];
type MatchInfo = {
  matchNumber: number;
  teamA: string;
  teamB: string;
  finalScoreA: number | null;
  finalScoreB: number | null;
  status: string;
  matchDate: string | null;
};

interface Props {
  eventId: string;
  letter: string;
  color: string;
  onClose: () => void;
}

export default function GroupDetailsModal({ eventId, letter, color, onClose }: Props) {
  const [standings, setStandings] = useState<Standings | null>(null);
  const [matches, setMatches] = useState<MatchInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"standings" | "matches">("standings");

  useEffect(() => {
    fetch(`/api/events/${eventId}/group/${letter}`)
      .then((r) => r.json())
      .then((data) => {
        setStandings(data.standings);
        setMatches(data.matches);
        setLoading(false);
      });
  }, [eventId, letter]);

  // close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl"
        style={{ borderTopColor: color, borderTopWidth: 3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Trophy size={16} style={{ color }} />
            <span className="font-bold text-white text-lg" style={{ color }}>
              בית {letter}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setTab("standings")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "standings"
                ? "text-white border-b-2"
                : "text-gray-500 hover:text-gray-300"
            }`}
            style={tab === "standings" ? { borderBottomColor: color } : undefined}
          >
            טבלת ניקוד
          </button>
          <button
            onClick={() => setTab("matches")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === "matches"
                ? "text-white border-b-2"
                : "text-gray-500 hover:text-gray-300"
            }`}
            style={tab === "matches" ? { borderBottomColor: color } : undefined}
          >
            משחקים ({matches?.length ?? "…"})
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="py-16 text-center text-gray-500 text-sm">טוען…</div>
          ) : tab === "standings" ? (
            <StandingsTab standings={standings!} color={color} />
          ) : (
            <MatchesTab matches={matches!} />
          )}
        </div>
      </div>
    </div>
  );
}

function StandingsTab({ standings, color }: { standings: Standings; color: string }) {
  if (standings.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">אין נתונים עדיין</div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
          <th className="text-right px-5 py-3 w-8">#</th>
          <th className="text-right px-5 py-3">שחקן</th>
          <th className="text-left px-5 py-3">נקודות</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => (
          <tr
            key={i}
            className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
          >
            <td className="px-5 py-3">
              {i === 0 ? (
                <span className="text-lg">🥇</span>
              ) : i === 1 ? (
                <span className="text-lg">🥈</span>
              ) : i === 2 ? (
                <span className="text-lg">🥉</span>
              ) : (
                <span className="text-gray-500 font-mono">{i + 1}</span>
              )}
            </td>
            <td className="px-5 py-3 font-medium text-white">{s.name}</td>
            <td className="px-5 py-3 text-left">
              <span
                className="font-bold text-base"
                style={i === 0 ? { color } : undefined}
              >
                {s.pts}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MatchesTab({ matches }: { matches: MatchInfo[] }) {
  if (matches.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">אין משחקים</div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {matches.map((m) => {
        const completed = m.status === "completed" && m.finalScoreA != null;
        const live = m.status === "live";
        return (
          <div key={m.matchNumber} className="flex items-center gap-3 px-5 py-3.5 text-sm">
            <span className="text-gray-600 text-xs w-7 shrink-0">#{m.matchNumber}</span>

            <div className="flex-1 flex items-center gap-2 justify-end" dir="ltr">
              <span className="text-gray-200">{m.teamA}</span>
              <span className="text-gray-600 text-xs">vs</span>
              <span className="text-gray-200">{m.teamB}</span>
            </div>

            <div className="w-14 text-center shrink-0">
              {completed ? (
                <span className="font-mono font-bold text-white">
                  {m.finalScoreA}–{m.finalScoreB}
                </span>
              ) : live ? (
                <span className="text-red-400 animate-pulse text-xs font-bold">LIVE</span>
              ) : (
                <span className="text-gray-600">—</span>
              )}
            </div>

            <div className="w-4 shrink-0">
              {completed ? (
                <CheckCircle size={13} className="text-green-500" />
              ) : (
                <Clock size={13} className="text-gray-700" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
