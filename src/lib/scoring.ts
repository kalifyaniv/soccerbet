// ─── Scoring Engine ─────────────────────────────────────────────────────────
// World Cup 2026 Betting App scoring logic

export type Score = { a: number; b: number };

export type ScoringMethod =
  | "exact"
  | "winner_and_goal"
  | "winner_only"
  | "goal_only"
  | "wrong";

export interface MatchResult {
  basePoints: number;
  isMultiplier: boolean;
  multiplierFactor: number;
  finalPoints: number;
  scoringMethod: ScoringMethod;
}

/**
 * Calculate points for a single match prediction.
 *
 * Point table:
 *   7 pts  – exact score
 *   4 pts  – correct winner AND exact goals for at least one team
 *   3 pts  – correct winner only (no goal match)
 *   1 pt   – exact goals for at least one team, wrong winner
 *   0 pts  – completely wrong
 *
 * All values doubled when isMultiplier = true.
 */
export function calculateMatchPoints(
  prediction: Score,
  actual: Score,
  isMultiplier: boolean
): MatchResult {
  const predWinner = Math.sign(prediction.a - prediction.b); // -1, 0, +1
  const actualWinner = Math.sign(actual.a - actual.b);
  const goalMatch = prediction.a === actual.a || prediction.b === actual.b;
  const winnerMatch = predWinner === actualWinner;

  let basePoints: number;
  let scoringMethod: ScoringMethod;

  if (prediction.a === actual.a && prediction.b === actual.b) {
    basePoints = 7;
    scoringMethod = "exact";
  } else if (winnerMatch && goalMatch) {
    basePoints = 4;
    scoringMethod = "winner_and_goal";
  } else if (winnerMatch) {
    basePoints = 3;
    scoringMethod = "winner_only";
  } else if (goalMatch) {
    basePoints = 1;
    scoringMethod = "goal_only";
  } else {
    basePoints = 0;
    scoringMethod = "wrong";
  }

  const multiplierFactor = isMultiplier ? 2 : 1;
  const finalPoints = basePoints * multiplierFactor;

  return { basePoints, isMultiplier, multiplierFactor, finalPoints, scoringMethod };
}

/**
 * Build the UNION of all player multiplier selections.
 * Returns sorted array of unique match numbers.
 * Also returns a count of how many slots were "lost" due to duplicates.
 */
export function calculateMultiplierUnion(allSelections: number[][]): {
  matchNumbers: number[];
  totalMultiplierGames: number;
  duplicateCount: number;
} {
  const seen = new Set<number>();
  let duplicateCount = 0;

  for (const playerPicks of allSelections) {
    for (const pick of playerPicks) {
      if (seen.has(pick)) {
        duplicateCount++;
      }
      seen.add(pick);
    }
  }

  const matchNumbers = Array.from(seen).sort((a, b) => a - b);
  return {
    matchNumbers,
    totalMultiplierGames: matchNumbers.length,
    duplicateCount,
  };
}

// Prize distribution constants (for reference):
// 12 × בית winner: 5% each = 60% total
// Overall top scorer: 20%
// King of Goals: 10%
// Tournament winner: 10%
// ──────────────────────────────────
// Total: 100%
//
// Winners are determined at runtime from PointLog (per groupLetter) and Player.totalPoints.
// See: /api/admin/events/[eventId]/payout and app/(app)/admin/payout/page.tsx
export const PRIZE_PERCENTAGES = {
  perGroup: 0.05,
  overall: 0.20,
  kingOfGoals: 0.10,
  tournamentWinner: 0.10,
} as const;
