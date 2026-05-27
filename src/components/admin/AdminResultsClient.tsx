"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, ChevronDown, ChevronUp, Save } from "lucide-react";
import { COUNTRIES } from "@/types";

interface MatchRow {
  id: string;
  matchNumber: number;
  groupLetter: string;
  teamA: string;
  teamB: string;
  matchDate: string | null;
  status: string;
  finalScoreA: number | null;
  finalScoreB: number | null;
}

interface Props {
  eventId: string;
  matches: MatchRow[];
  actualTopScorer: string;
  actualWinner: string;
}

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#f97316", C: "#eab308", D: "#22c55e",
  E: "#14b8a6", F: "#3b82f6", G: "#8b5cf6", H: "#ec4899",
  I: "#6366f1", J: "#f59e0b", K: "#10b981", L: "#64748b",
};

export default function AdminResultsClient({
  eventId,
  matches,
  actualTopScorer,
  actualWinner,
}: Props) {
  const router = useRouter();
  const [matchData, setMatchData] = useState<MatchRow[]>(matches);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [topScorer, setTopScorer] = useState(actualTopScorer);
  const [winner, setWinner] = useState(actualWinner);
  const [savingBonus, setSavingBonus] = useState(false);
  const [bonusMsg, setBonusMsg] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>("A");

  const groups = [...new Set(matchData.map((m) => m.groupLetter))].sort();

  async function saveResult(match: MatchRow) {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b)) return;

    setSaving(match.id);
    const res = await fetch(`/api/admin/events/${eventId}/result/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finalScoreA: a, finalScoreB: b }),
    });

    setSaving(null);
    if (res.ok) {
      setMatchData((prev) =>
        prev.map((m) =>
          m.id === match.id
            ? { ...m, finalScoreA: a, finalScoreB: b, status: "completed" }
            : m
        )
      );
      setEditingId(null);
      router.refresh();
    }
  }

  async function saveBonus() {
    setSavingBonus(true);
    setBonusMsg("");
    const res = await fetch(`/api/admin/events/${eventId}/bonus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualTopScorer: topScorer, actualWinner: winner }),
    });
    const data = await res.json();
    setSavingBonus(false);
    if (res.ok) {
      setBonusMsg(
        `נשמר! מלך השערים: ${data.kingOfGoalsCorrect} נכון, זוכה הגביע: ${data.tournamentWinnerCorrect} נכון`
      );
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">הזנת תוצאות</h1>

      {/* Bonus section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-white">🎯 תוצאות בונוס</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">מלך השערים (שם שחקן בפועל)</label>
            <input
              type="text"
              value={topScorer}
              onChange={(e) => setTopScorer(e.target.value)}
              placeholder="לדוגמה: Kylian Mbappé"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">זוכה גביע העולם (בפועל)</label>
            <select
              value={winner}
              onChange={(e) => setWinner(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option value="">בחר מדינה...</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        {bonusMsg && (
          <p className="text-sm text-green-400 bg-green-900/20 border border-green-700 rounded-lg px-3 py-2">
            ✓ {bonusMsg}
          </p>
        )}
        <button
          onClick={saveBonus}
          disabled={savingBonus}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {savingBonus ? "שומר..." : "שמור תוצאות בונוס"}
        </button>
      </div>

      {/* Match results by group */}
      <div className="space-y-3">
        {groups.map((g) => {
          const groupMatches = matchData.filter((m) => m.groupLetter === g);
          const doneCount = groupMatches.filter((m) => m.status === "completed").length;
          return (
            <div key={g} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                style={{ color: GROUP_COLORS[g] }}
                onClick={() => setOpenGroup(openGroup === g ? null : g)}
              >
                <span>בית {g} — {doneCount}/{groupMatches.length} הושלמו</span>
                {openGroup === g ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {openGroup === g && (
                <div className="divide-y divide-gray-800">
                  {groupMatches.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="text-gray-500 text-xs w-6 shrink-0">#{m.matchNumber}</span>

                      <div className="flex-1">
                        <span className="text-gray-200">{m.teamA}</span>
                        <span className="text-gray-500 mx-2">vs</span>
                        <span className="text-gray-200">{m.teamB}</span>
                      </div>

                      {/* Result or edit */}
                      {editingId === m.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={scoreA}
                            onChange={(e) => setScoreA(e.target.value)}
                            autoFocus
                            className="w-12 text-center bg-gray-800 border border-green-600 rounded-lg py-1 text-white font-mono text-base focus:outline-none"
                          />
                          <span className="text-gray-400">–</span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={scoreB}
                            onChange={(e) => setScoreB(e.target.value)}
                            className="w-12 text-center bg-gray-800 border border-green-600 rounded-lg py-1 text-white font-mono text-base focus:outline-none"
                          />
                          <button
                            onClick={() => saveResult(m)}
                            disabled={saving === m.id}
                            className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {saving === m.id ? "..." : "שמור"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-xs text-gray-500 hover:text-white px-2 py-1"
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {m.status === "completed" ? (
                            <span className="font-mono font-bold text-white text-base">
                              {m.finalScoreA} – {m.finalScoreB}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">לא הוזן</span>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(m.id);
                              setScoreA(m.finalScoreA?.toString() ?? "");
                              setScoreB(m.finalScoreB?.toString() ?? "");
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            {m.status === "completed" ? "ערוך" : "הזן"}
                          </button>
                          {m.status === "completed" ? (
                            <CheckCircle size={14} className="text-green-500" />
                          ) : (
                            <Clock size={14} className="text-gray-600" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
