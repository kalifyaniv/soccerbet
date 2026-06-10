"use client";

import { useState, useMemo } from "react";
import { Calculator, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { calculateMatchPoints } from "@/lib/scoring";

export type ParticipantRow = {
  playerId: string;
  playerName: string;
  isCurrentUser: boolean;
  prediction: { a: number; b: number } | null;
  isPersonalMultiplier: boolean;
  currentGroupPoints: number;
};

export type MatchTab = {
  matchId: string;
  teamA: string;
  teamB: string;
  participants: ParticipantRow[];
  currentRankings: { playerId: string; rank: number }[];
};

interface Props {
  matches: MatchTab[];
}

export default function PredictorClient({ matches }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  function switchTab(idx: number) {
    setActiveTab(idx);
    setScoreA("");
    setScoreB("");
  }

  const active = matches[activeTab];
  const parsedA = parseInt(scoreA);
  const parsedB = parseInt(scoreB);
  const hasValidInput = !isNaN(parsedA) && !isNaN(parsedB) && parsedA >= 0 && parsedB >= 0;

  const currentRankMap = useMemo(() => {
    const map = new Map<string, number>();
    active.currentRankings.forEach(({ playerId, rank }) => map.set(playerId, rank));
    return map;
  }, [active]);

  const predictedRows = useMemo(() => {
    const actual = hasValidInput ? { a: parsedA, b: parsedB } : null;

    const rows = active.participants.map((p) => {
      let hypotheticalPoints = 0;
      if (actual && p.prediction) {
        hypotheticalPoints = calculateMatchPoints(p.prediction, actual, p.isPersonalMultiplier).finalPoints;
      }
      return { ...p, hypotheticalPoints, newGroupTotal: p.currentGroupPoints + hypotheticalPoints };
    });

    return rows
      .sort((a, b) => b.newGroupTotal - a.newGroupTotal)
      .map((p, i) => ({ ...p, newRank: i + 1 }));
  }, [hasValidInput, parsedA, parsedB, active]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <Calculator size={16} className="text-purple-400" />
        <h2 className="font-semibold text-white">מחשבון תוצאה</h2>
      </div>

      {/* Tabs — only shown when more than one match */}
      {matches.length > 1 && (
        <div className="flex border-b border-gray-800 overflow-x-auto">
          {matches.map((m, i) => (
            <button
              key={m.matchId}
              onClick={() => switchTab(i)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                i === activeTab
                  ? "text-white border-b-2 border-purple-500 bg-gray-800/40"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/20"
              }`}
            >
              {m.teamA} – {m.teamB}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1.5 truncate max-w-24">{active.teamA}</div>
            <input
              type="number"
              min="0"
              max="20"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              placeholder="0"
              className="w-16 h-12 text-center text-2xl font-bold bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <span className="text-2xl font-bold text-gray-500 mt-5">–</span>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1.5 truncate max-w-24">{active.teamB}</div>
            <input
              type="number"
              min="0"
              max="20"
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              placeholder="0"
              className="w-16 h-12 text-center text-2xl font-bold bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-right px-3 py-2 w-8">#</th>
                <th className="text-right px-3 py-2">שחקן</th>
                <th className="text-center px-3 py-2">תחזית</th>
                <th className="text-center px-3 py-2">נקודות נוספות</th>
                <th className="text-center px-3 py-2">סה״כ בבית</th>
                <th className="text-center px-3 py-2 w-8">שינוי</th>
              </tr>
            </thead>
            <tbody>
              {predictedRows.map((p) => {
                const prevRank = currentRankMap.get(p.playerId);
                const rankDelta = prevRank != null ? prevRank - p.newRank : 0;
                return (
                  <tr
                    key={p.playerId}
                    className={`border-b border-gray-800/50 transition-colors ${
                      p.isCurrentUser ? "bg-green-900/20" : "hover:bg-gray-800/30"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-center">{p.newRank}</td>
                    <td className="px-3 py-2.5 font-medium text-white">
                      {p.playerName}
                      {p.isCurrentUser && <span className="mr-2 text-xs text-green-400">(אני)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-200">
                      {p.prediction ? (
                        <span className="inline-flex items-center gap-1">
                          {p.prediction.a}–{p.prediction.b}
                          {p.isPersonalMultiplier && (
                            <Zap size={10} fill="currentColor" className="text-yellow-400" />
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {hasValidInput && p.prediction ? (
                        <span className={`font-semibold ${p.hypotheticalPoints > 0 ? "text-green-400" : "text-gray-500"}`}>
                          +{p.hypotheticalPoints}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-lg font-bold text-white">{p.newGroupTotal}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {hasValidInput && prevRank != null && rankDelta !== 0 ? (
                        rankDelta > 0 ? (
                          <span className="text-green-400 inline-flex items-center gap-0.5 text-xs font-semibold">
                            <TrendingUp size={13} />
                            {rankDelta}
                          </span>
                        ) : (
                          <span className="text-red-400 inline-flex items-center gap-0.5 text-xs font-semibold">
                            <TrendingDown size={13} />
                            {Math.abs(rankDelta)}
                          </span>
                        )
                      ) : (
                        <Minus size={13} className="text-gray-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
