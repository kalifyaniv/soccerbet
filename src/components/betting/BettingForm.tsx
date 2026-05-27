"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, Star, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react";
import { COUNTRIES, KNOWN_SCORERS } from "@/types";
import type { GroupPredictionsMap } from "@/types";

interface MatchInfo {
  id: string;
  matchNumber: number;
  groupLetter: string;
  teamA: string;
  teamB: string;
  matchDate: string | null;
  venue: string | null;
}

interface Props {
  eventId: string;
  bettingDeadline: string;
  isBettingOpen: boolean;
  matches: MatchInfo[];
  existingBet: {
    status: string;
    groupPredictions: string;
    multiplierGames: string;
    kingOfGoalsPlayer: string;
    tournamentWinner: string;
  } | null;
}

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444", B: "#f97316", C: "#eab308", D: "#22c55e",
  E: "#14b8a6", F: "#3b82f6", G: "#8b5cf6", H: "#ec4899",
  I: "#6366f1", J: "#f59e0b", K: "#10b981", L: "#64748b",
};

const MAX_MULTIPLIERS = 2;

export default function BettingForm({
  eventId,
  bettingDeadline,
  isBettingOpen,
  matches,
  existingBet,
}: Props) {
  const router = useRouter();
  const isLocked = existingBet?.status === "locked";

  // State
  const [predictions, setPredictions] = useState<GroupPredictionsMap>({});
  const [multipliers, setMultipliers] = useState<number[]>([]);
  const [kingOfGoals, setKingOfGoals] = useState("");
  const [tournamentWinner, setTournamentWinner] = useState("");
  const [activeGroup, setActiveGroup] = useState("A");
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState("");

  // Groups
  const groups = [...new Set(matches.map((m) => m.groupLetter))].sort();

  // Load existing bet or draft from localStorage
  useEffect(() => {
    if (existingBet) {
      setPredictions(JSON.parse(existingBet.groupPredictions || "{}"));
      setMultipliers(JSON.parse(existingBet.multiplierGames || "[]"));
      setKingOfGoals(existingBet.kingOfGoalsPlayer || "");
      setTournamentWinner(existingBet.tournamentWinner || "");
    } else {
      // Try localStorage draft
      const draft = localStorage.getItem(`draft_${eventId}`);
      if (draft) {
        try {
          const d = JSON.parse(draft);
          if (d.predictions) setPredictions(d.predictions);
          if (d.multipliers) setMultipliers(d.multipliers);
          if (d.kingOfGoals) setKingOfGoals(d.kingOfGoals);
          if (d.tournamentWinner) setTournamentWinner(d.tournamentWinner);
        } catch {}
      }
    }
  }, [existingBet, eventId]);

  // Countdown timer
  useEffect(() => {
    function update() {
      const diff = new Date(bettingDeadline).getTime() - Date.now();
      if (diff <= 0) { setCountdown("נסגר"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${d}ימים ${h}שעות ${m}דקות ${s}שניות`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [bettingDeadline]);

  // Auto-save draft
  const saveDraft = useCallback(async () => {
    if (isLocked || !isBettingOpen) return;
    localStorage.setItem(`draft_${eventId}`, JSON.stringify({ predictions, multipliers, kingOfGoals, tournamentWinner }));
    setSaving(true);
    try {
      await fetch(`/api/events/${eventId}/bet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupPredictions: predictions, multiplierGames: multipliers, kingOfGoalsPlayer: kingOfGoals, tournamentWinner }),
      });
    } finally {
      setTimeout(() => setSaving(false), 800);
    }
  }, [isLocked, isBettingOpen, eventId, predictions, multipliers, kingOfGoals, tournamentWinner]);

  // Auto-save every 30s
  useEffect(() => {
    if (isLocked) return;
    const id = setInterval(saveDraft, 30000);
    return () => clearInterval(id);
  }, [isLocked, saveDraft]);

  function setScore(matchNumber: number, side: "a" | "b", val: string) {
    const num = val === "" ? 0 : Math.max(0, Math.min(20, parseInt(val) || 0));
    setPredictions((prev) => ({
      ...prev,
      [matchNumber]: { a: prev[matchNumber]?.a ?? 0, b: prev[matchNumber]?.b ?? 0, [side]: num },
    }));
  }

  function toggleMultiplier(matchNumber: number) {
    setMultipliers((prev) => {
      if (prev.includes(matchNumber)) return prev.filter((n) => n !== matchNumber);
      if (prev.length >= MAX_MULTIPLIERS) return prev;
      return [...prev, matchNumber];
    });
  }

  // Validation
  const filledMatches = matches.filter(
    (m) => predictions[m.matchNumber] !== undefined
  ).length;
  const isComplete =
    filledMatches === 72 &&
    multipliers.length === 2 &&
    kingOfGoals.trim().length > 0 &&
    tournamentWinner.trim().length > 0;

  async function handleSubmit() {
    if (!isComplete) return;
    setError("");
    setSubmitting(true);

    const res = await fetch(`/api/events/${eventId}/bet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupPredictions: predictions,
        multiplierGames: multipliers,
        kingOfGoalsPlayer: kingOfGoals,
        tournamentWinner,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.message ?? data.error ?? "שגיאה בשמירה");
    } else {
      localStorage.removeItem(`draft_${eventId}`);
      setSuccessMsg("ההימורים נעולו בהצלחה! 🎉");
      router.refresh();
    }
  }

  // ─── Locked view ────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="space-y-6">
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle className="text-green-400 shrink-0" size={24} />
          <div>
            <h2 className="text-white font-semibold text-lg">ההימורים שלך נעולים ✓</h2>
            <p className="text-green-300 text-sm mt-0.5">
              כל 72 ניחושי קבוצות הוגשו. בהצלחה!
            </p>
          </div>
        </div>

        <LockedBetView
          matches={matches}
          predictions={predictions}
          multipliers={multipliers}
          kingOfGoals={kingOfGoals}
          tournamentWinner={tournamentWinner}
          groups={groups}
        />
      </div>
    );
  }

  // ─── Open form ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">טופס הימורים 2026</h1>
          <p className="text-gray-400 text-sm mt-1">
            {filledMatches}/72 משחקים מולאו
          </p>
        </div>
        <div className={`text-sm px-3 py-2 rounded-lg font-mono ${
          isBettingOpen
            ? "bg-green-900/30 border border-green-700 text-green-300"
            : "bg-red-900/30 border border-red-700 text-red-300"
        }`}>
          {isBettingOpen ? `⏱ נסגר בעוד: ${countdown}` : "🔒 ההימורים נסגרו"}
        </div>
      </div>

      {!isBettingOpen && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 text-red-300 flex items-center gap-2">
          <AlertTriangle size={20} />
          מועד ההגשה עבר — לא ניתן עוד להגיש הימורים.
        </div>
      )}

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all rounded-full"
          style={{ width: `${(filledMatches / 72) * 100}%` }}
        />
      </div>

      {/* Group tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {groups.map((g) => {
          const groupMatches = matches.filter((m) => m.groupLetter === g);
          const filled = groupMatches.filter((m) => predictions[m.matchNumber] !== undefined).length;
          const isComplete = filled === groupMatches.length;
          return (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              style={{
                borderColor: activeGroup === g ? GROUP_COLORS[g] : "transparent",
                color: activeGroup === g ? GROUP_COLORS[g] : "#9ca3af",
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-all bg-gray-900 hover:bg-gray-800 relative"
            >
              בית {g}
              {isComplete && (
                <span className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full border border-gray-950" />
              )}
            </button>
          );
        })}
      </div>

      {/* Multiplier status */}
      <div className="flex items-center gap-2 text-sm">
        <Star size={16} className="text-yellow-400" fill="currentColor" />
        <span className="text-gray-300">
          משחקי מכפיל: {" "}
          <span className={multipliers.length === 2 ? "text-yellow-400 font-semibold" : "text-gray-400"}>
            {multipliers.length}/2 נבחרו
          </span>
        </span>
        {multipliers.map((num) => {
          const m = matches.find((x) => x.matchNumber === num);
          return m ? (
            <span key={num} className="text-xs bg-yellow-900/40 border border-yellow-700/40 text-yellow-300 px-2 py-0.5 rounded-full">
              #{num} {m.teamA} vs {m.teamB}
            </span>
          ) : null;
        })}
      </div>

      {/* Active group matches */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div
          className="px-4 py-3 border-b border-gray-800 font-semibold text-sm"
          style={{ color: GROUP_COLORS[activeGroup] }}
        >
          בית {activeGroup}
        </div>
        <div className="divide-y divide-gray-800">
          {matches
            .filter((m) => m.groupLetter === activeGroup)
            .map((m) => {
              const pred = predictions[m.matchNumber];
              const isMultiplier = multipliers.includes(m.matchNumber);
              const canSelectMultiplier =
                multipliers.length < MAX_MULTIPLIERS || isMultiplier;

              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isMultiplier ? "bg-yellow-900/10" : ""
                  }`}
                >
                  <span className="text-gray-500 text-xs w-6 shrink-0">#{m.matchNumber}</span>

                  {/* Score input */}
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-white text-sm font-medium min-w-24 text-left">{m.teamA}</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={pred?.a ?? ""}
                      onChange={(e) => setScore(m.matchNumber, "a", e.target.value)}
                      disabled={!isBettingOpen}
                      placeholder="0"
                      className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white font-mono text-lg focus:outline-none focus:border-green-500 disabled:opacity-50"
                    />
                    <span className="text-gray-500 font-bold">–</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={pred?.b ?? ""}
                      onChange={(e) => setScore(m.matchNumber, "b", e.target.value)}
                      disabled={!isBettingOpen}
                      placeholder="0"
                      className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white font-mono text-lg focus:outline-none focus:border-green-500 disabled:opacity-50"
                    />
                    <span className="text-white text-sm font-medium min-w-24">{m.teamB}</span>
                  </div>

                  {/* Multiplier toggle */}
                  <button
                    onClick={() => toggleMultiplier(m.matchNumber)}
                    disabled={!isBettingOpen || (!canSelectMultiplier && !isMultiplier)}
                    title={isMultiplier ? "הסר מכפיל" : "הגדר כמשחק מכפיל (×2)"}
                    className={`shrink-0 transition-all ${
                      isMultiplier
                        ? "text-yellow-400"
                        : canSelectMultiplier
                        ? "text-gray-600 hover:text-yellow-500"
                        : "text-gray-800 cursor-not-allowed"
                    }`}
                  >
                    <Star size={18} fill={isMultiplier ? "currentColor" : "none"} />
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* Bonus predictions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-white">🎯 ניחושי בונוס</h3>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            מלך השערים — שם שחקן (שלב הבתים בלבד)
            <span className="text-yellow-400 mr-1">+10 נקודות</span>
          </label>
          <input
            type="text"
            value={kingOfGoals}
            onChange={(e) => setKingOfGoals(e.target.value)}
            disabled={!isBettingOpen}
            list="scorers-list"
            placeholder="לדוגמה: Lionel Messi"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50"
          />
          <datalist id="scorers-list">
            {KNOWN_SCORERS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            זוכה גביע העולם 2026
            <span className="text-yellow-400 mr-1">+10 נקודות</span>
          </label>
          <select
            value={tournamentWinner}
            onChange={(e) => setTournamentWinner(e.target.value)}
            disabled={!isBettingOpen}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500 disabled:opacity-50"
          >
            <option value="">בחר מדינה...</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Errors & success */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Action buttons */}
      {isBettingOpen && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
          >
            {saving ? "שומר..." : "💾 שמור טיוטה"}
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-blue-700 text-blue-300 hover:bg-blue-900/20 transition-colors text-sm flex items-center justify-center gap-2"
          >
            {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            תצוגה מקדימה
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isComplete || submitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            {submitting ? "שולח..." : "נעל הימורים לצמיתות"}
          </button>
        </div>
      )}

      {/* Validation summary */}
      {!isComplete && isBettingOpen && (
        <div className="text-sm text-gray-500 space-y-1 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <p className="font-medium text-gray-400 mb-2">נדרש להשלמה:</p>
          {filledMatches < 72 && <p>⚠️ {72 - filledMatches} משחקים חסרים</p>}
          {multipliers.length < 2 && <p>⚠️ בחר {2 - multipliers.length} משחקי מכפיל נוספים (⭐)</p>}
          {!kingOfGoals.trim() && <p>⚠️ חסר ניחוש מלך השערים</p>}
          {!tournamentWinner.trim() && <p>⚠️ חסר ניחוש זוכה הגביע</p>}
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <BetPreview
          matches={matches}
          predictions={predictions}
          multipliers={multipliers}
          kingOfGoals={kingOfGoals}
          tournamentWinner={tournamentWinner}
          groups={groups}
          onClose={() => setShowPreview(false)}
          onConfirm={handleSubmit}
          canSubmit={isComplete && !submitting}
        />
      )}
    </div>
  );
}

// ─── Locked Bet View ─────────────────────────────────────────────────────────

function LockedBetView({
  matches, predictions, multipliers, kingOfGoals, tournamentWinner, groups,
}: {
  matches: MatchInfo[];
  predictions: GroupPredictionsMap;
  multipliers: number[];
  kingOfGoals: string;
  tournamentWinner: string;
  groups: string[];
}) {
  const [openGroup, setOpenGroup] = useState<string | null>("A");

  return (
    <div className="space-y-3">
      {/* Bonus summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">מלך השערים</p>
          <p className="text-white font-semibold mt-1">{kingOfGoals || "—"}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">זוכה הגביע</p>
          <p className="text-white font-semibold mt-1">{tournamentWinner || "—"}</p>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        ⭐ משחקי מכפיל:{" "}
        {multipliers.map((n) => {
          const m = matches.find((x) => x.matchNumber === n);
          return m ? `#${n} ${m.teamA} vs ${m.teamB}` : `#${n}`;
        }).join(", ") || "—"}
      </p>

      {groups.map((g) => (
        <div key={g} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
            style={{ color: GROUP_COLORS[g] }}
            onClick={() => setOpenGroup(openGroup === g ? null : g)}
          >
            <span>בית {g}</span>
            {openGroup === g ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {openGroup === g && (
            <div className="divide-y divide-gray-800">
              {matches.filter((m) => m.groupLetter === g).map((m) => {
                const pred = predictions[m.matchNumber];
                const isMul = multipliers.includes(m.matchNumber);
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="text-gray-500 text-xs w-6">#{m.matchNumber}</span>
                    <span className="flex-1 text-gray-300">{m.teamA}</span>
                    <span className="font-mono font-bold text-white text-base">
                      {pred ? `${pred.a} – ${pred.b}` : "? – ?"}
                    </span>
                    <span className="flex-1 text-left text-gray-300">{m.teamB}</span>
                    {isMul && <Star size={14} className="text-yellow-400 shrink-0" fill="currentColor" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function BetPreview({
  matches, predictions, multipliers, kingOfGoals, tournamentWinner, groups,
  onClose, onConfirm, canSubmit,
}: {
  matches: MatchInfo[];
  predictions: GroupPredictionsMap;
  multipliers: number[];
  kingOfGoals: string;
  tournamentWinner: string;
  groups: string[];
  onClose: () => void;
  onConfirm: () => void;
  canSubmit: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto flex items-start justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl my-8">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">תצוגה מקדימה — כל ניחושיך</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {groups.map((g) => (
            <div key={g}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: GROUP_COLORS[g] }}>
                בית {g}
              </h3>
              <div className="space-y-1">
                {matches.filter((m) => m.groupLetter === g).map((m) => {
                  const pred = predictions[m.matchNumber];
                  const isMul = multipliers.includes(m.matchNumber);
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-sm py-1 border-b border-gray-800/50">
                      <span className="text-gray-500 text-xs w-5">#{m.matchNumber}</span>
                      <span className="flex-1 text-gray-300">{m.teamA}</span>
                      <span className="font-mono font-bold text-white px-2">
                        {pred ? `${pred.a} – ${pred.b}` : <span className="text-red-400">חסר!</span>}
                      </span>
                      <span className="flex-1 text-left text-gray-300">{m.teamB}</span>
                      {isMul && <Star size={12} className="text-yellow-400" fill="currentColor" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="border-t border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">מלך השערים:</span>
              <span className="text-white font-medium">{kingOfGoals || <span className="text-red-400">חסר</span>}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">זוכה הגביע:</span>
              <span className="text-white font-medium">{tournamentWinner || <span className="text-red-400">חסר</span>}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">משחקי מכפיל:</span>
              <span className="text-yellow-400">{multipliers.join(", ") || "—"}</span>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 accent-green-500"
            />
            <span className="text-sm text-gray-300">
              אני מאשר שהניחושים שלי נכונים. ברגע שאנעל — לא ניתן לשנות.
            </span>
          </label>

          <button
            onClick={onConfirm}
            disabled={!confirmed || !canSubmit}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Lock size={18} />
            נעל הימורים לצמיתות
          </button>
        </div>
      </div>
    </div>
  );
}
