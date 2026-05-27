"use client";

import { useState } from "react";
import { CheckCircle, Clock, Zap, ChevronDown, ChevronUp, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ParticipantBet = {
  playerName: string;
  isMe: boolean;
  predA: number | null;
  predB: number | null;
  points: number | null;
  method: string | null;
  isMultiplier: boolean;
};

export type MatchRow = {
  id: string;
  matchNumber: number;
  groupLetter: string;
  teamA: string;
  teamB: string;
  matchDate: string | null;       // ISO string – used for sorting
  matchDateLabel: string | null;  // pre-formatted Jerusalem time – used for display
  status: string;
  finalScoreA: number | null;
  finalScoreB: number | null;
  myPred: { a: number; b: number } | null;
  myPoints: number | null;
  myMethod: string | null;
  isMyMultiplier: boolean;
  participantBets: ParticipantBet[];
};

interface Props {
  matches: MatchRow[];
  totalPts: number;
  hasPlayer: boolean;
  completedCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#f97316", C: "#eab308", D: "#22c55e",
  E: "#14b8a6", F: "#3b82f6", G: "#8b5cf6", H: "#ec4899",
  I: "#6366f1", J: "#f59e0b", K: "#10b981", L: "#64748b",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResultsClient({ matches, totalPts, hasPlayer, completedCount }: Props) {
  const [view, setView] = useState<"group" | "date">("group");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (n: number) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(n) ? s.delete(n) : s.add(n);
      return s;
    });

  const groups = [...new Set(matches.map((m) => m.groupLetter))].sort();

  const matchesByDate = [...matches].sort((a, b) => {
    if (!a.matchDate && !b.matchDate) return 0;
    if (!a.matchDate) return 1;
    if (!b.matchDate) return -1;
    return a.matchDate.localeCompare(b.matchDate);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">תוצאות משחקים</h1>
          <p className="text-gray-400 text-sm mt-1">{completedCount}/72 הושלמו</p>
        </div>
        {hasPlayer && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-center">
            <div className="text-xs text-gray-500">הנקודות שלי עד כה</div>
            <div className="text-2xl font-bold text-green-400">{totalPts}</div>
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("group")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "group" ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-white"
          }`}
        >
          לפי בית
        </button>
        <button
          onClick={() => setView("date")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            view === "date" ? "bg-gray-700 text-white shadow" : "text-gray-400 hover:text-white"
          }`}
        >
          לפי תאריך
        </button>
      </div>

      {/* ── Group view ── */}
      {view === "group" && (
        <div className="space-y-4">
          {groups.map((g) => {
            const groupMatches = matches.filter((m) => m.groupLetter === g);
            const groupPts = groupMatches.reduce((s, m) => s + (m.myPoints ?? 0), 0);
            return (
              <div key={g} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 border-b border-gray-800"
                  style={{ borderLeftColor: GROUP_COLORS[g], borderLeftWidth: 3 }}
                >
                  <span className="font-semibold text-sm" style={{ color: GROUP_COLORS[g] }}>
                    בית {g}
                  </span>
                  {hasPlayer && (
                    <span className="text-xs text-gray-400">{groupPts} נקודות בקבוצה</span>
                  )}
                </div>
                <div className="divide-y divide-gray-800">
                  {groupMatches.map((m) => (
                    <MatchRowGroup
                      key={m.id}
                      m={m}
                      hasPlayer={hasPlayer}
                      isExpanded={expanded.has(m.matchNumber)}
                      onToggle={() => toggleExpand(m.matchNumber)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Date view ── */}
      {view === "date" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-800">
            {matchesByDate.map((m) => (
              <div key={m.id}>
                {/* Match row */}
                <div className="flex items-center gap-2 px-4 py-3 text-sm">
                  {/* Group chip */}
                  <span
                    className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded border"
                    style={{
                      color: GROUP_COLORS[m.groupLetter],
                      borderColor: GROUP_COLORS[m.groupLetter] + "55",
                      backgroundColor: GROUP_COLORS[m.groupLetter] + "15",
                    }}
                  >
                    {m.groupLetter}
                  </span>

                  <span className="text-gray-600 text-xs w-5 shrink-0">#{m.matchNumber}</span>

                  {/* Teams + time */}
                  <div className="flex-1 min-w-0">
                    <div>
                      <span className="text-gray-200">{m.teamA}</span>
                      <span className="text-gray-500 mx-2">vs</span>
                      <span className="text-gray-200">{m.teamB}</span>
                    </div>
                    {m.matchDateLabel && (
                      <div className="text-xs text-gray-500 mt-0.5 text-end" dir="ltr">
                        🕐 {m.matchDateLabel} IL
                      </div>
                    )}
                  </div>

                  {/* Result */}
                  <div className="text-center w-14 shrink-0">
                    {m.status === "completed" && m.finalScoreA != null ? (
                      <span className="font-mono font-bold text-white">
                        {m.finalScoreA}–{m.finalScoreB}
                      </span>
                    ) : m.status === "live" ? (
                      <span className="text-red-400 animate-pulse text-xs">LIVE</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </div>

                  {/* My points */}
                  {hasPlayer && (
                    <div className="w-14 shrink-0">
                      {m.myPoints != null ? (
                        <PointsBadge
                          points={m.myPoints}
                          method={m.myMethod ?? ""}
                          isMultiplier={m.isMyMultiplier}
                        />
                      ) : m.isMyMultiplier ? (
                        <span className="text-yellow-600 text-xs">⭐</span>
                      ) : null}
                    </div>
                  )}

                  {/* Expand button */}
                  <button
                    onClick={() => toggleExpand(m.matchNumber)}
                    className="shrink-0 p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                    title="הצג הימורים"
                  >
                    {expanded.has(m.matchNumber) ? (
                      <ChevronUp size={15} />
                    ) : (
                      <ChevronDown size={15} />
                    )}
                  </button>
                </div>

                {/* Expanded: participant bets */}
                {expanded.has(m.matchNumber) && (
                  <div className="bg-gray-800/50 border-t border-gray-700/50 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2.5">
                      <Users size={12} />
                      <span>הימורי המשתתפים</span>
                    </div>

                    {m.participantBets.length === 0 ? (
                      <p className="text-xs text-gray-600">אין הימורים עדיין</p>
                    ) : (
                      <div className="space-y-1">
                        {m.participantBets.map((bet, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-xs ${
                              bet.isMe
                                ? "bg-green-900/25 border border-green-800/40"
                                : "hover:bg-gray-700/30"
                            }`}
                          >
                            {/* Name */}
                            <span
                              className={`flex-1 font-medium ${
                                bet.isMe ? "text-green-300" : "text-gray-300"
                              }`}
                            >
                              {bet.playerName}
                              {bet.isMe && (
                                <span className="text-green-500 font-normal mr-1"> (אני)</span>
                              )}
                            </span>

                            {/* Multiplier */}
                            {bet.isMultiplier && (
                              <Zap size={11} className="text-yellow-400 shrink-0" />
                            )}

                            {/* Prediction */}
                            <span
                              className="font-mono text-gray-400 w-10 text-center shrink-0"
                              dir="ltr"
                            >
                              {bet.predA != null && bet.predB != null
                                ? `${bet.predA}–${bet.predB}`
                                : "—"}
                            </span>

                            {/* Points */}
                            <div className="w-20 shrink-0">
                              {bet.points != null ? (
                                <PointsBadge
                                  points={bet.points}
                                  method={bet.method ?? ""}
                                  isMultiplier={false}
                                />
                              ) : (
                                <span className="text-gray-600">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MatchRowGroup({
  m,
  hasPlayer,
  isExpanded,
  onToggle,
}: {
  m: MatchRow;
  hasPlayer: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 text-sm">
        <span className="text-gray-500 text-xs w-6 shrink-0">#{m.matchNumber}</span>

        <div className="flex-1 min-w-0">
          <div>
            <span className="text-gray-200">{m.teamA}</span>
            <span className="text-gray-500 mx-2">vs</span>
            <span className="text-gray-200">{m.teamB}</span>
          </div>
          {m.matchDateLabel && (
            <div className="text-xs text-gray-500 mt-0.5 text-end" dir="ltr">
              🕐 {m.matchDateLabel} IL
            </div>
          )}
        </div>

        {/* My prediction */}
        <div className="text-center w-16">
          {m.myPred ? (
            <span className="font-mono text-gray-400">
              {m.myPred.a}–{m.myPred.b}
            </span>
          ) : (
            <span className="text-gray-700">—</span>
          )}
        </div>

        {/* Result */}
        <div className="text-center w-16">
          {m.status === "completed" && m.finalScoreA != null ? (
            <span className="font-mono font-bold text-white">
              {m.finalScoreA}–{m.finalScoreB}
            </span>
          ) : m.status === "live" ? (
            <span className="text-red-400 animate-pulse">LIVE</span>
          ) : (
            <span className="text-gray-600">—</span>
          )}
        </div>

        {/* Points */}
        {hasPlayer && (
          <div className="w-16 text-left">
            {m.myPoints != null ? (
              <PointsBadge
                points={m.myPoints}
                method={m.myMethod ?? ""}
                isMultiplier={m.isMyMultiplier}
              />
            ) : m.isMyMultiplier ? (
              <span className="text-yellow-600 text-xs">⭐ מכפיל</span>
            ) : null}
          </div>
        )}

        {/* Status icon */}
        <div className="w-5 shrink-0">
          {m.status === "completed" ? (
            <CheckCircle size={14} className="text-green-500" />
          ) : (
            <Clock size={14} className="text-gray-600" />
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={onToggle}
          className="shrink-0 p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
          title="הצג הימורים"
        >
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Expanded: participant bets */}
      {isExpanded && (
        <div className="bg-gray-800/50 border-t border-gray-700/50 px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2.5">
            <Users size={12} />
            <span>הימורי המשתתפים</span>
          </div>
          {m.participantBets.length === 0 ? (
            <p className="text-xs text-gray-600">אין הימורים עדיין</p>
          ) : (
            <div className="space-y-1">
              {m.participantBets.map((bet, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-xs ${
                    bet.isMe
                      ? "bg-green-900/25 border border-green-800/40"
                      : "hover:bg-gray-700/30"
                  }`}
                >
                  <span
                    className={`flex-1 font-medium ${
                      bet.isMe ? "text-green-300" : "text-gray-300"
                    }`}
                  >
                    {bet.playerName}
                    {bet.isMe && (
                      <span className="text-green-500 font-normal mr-1"> (אני)</span>
                    )}
                  </span>
                  {bet.isMultiplier && (
                    <Zap size={11} className="text-yellow-400 shrink-0" />
                  )}
                  <span className="font-mono text-gray-400 w-10 text-center shrink-0" dir="ltr">
                    {bet.predA != null && bet.predB != null
                      ? `${bet.predA}–${bet.predB}`
                      : "—"}
                  </span>
                  <div className="w-20 shrink-0">
                    {bet.points != null ? (
                      <PointsBadge points={bet.points} method={bet.method ?? ""} isMultiplier={false} />
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
