import { describe, it, expect } from "vitest";
import {
  calculateMatchPoints,
  calculateMultiplierUnion,
  PRIZE_PERCENTAGES,
} from "./scoring";

// ─── calculateMatchPoints ────────────────────────────────────────────────────

describe("calculateMatchPoints – exact score (7 pts)", () => {
  it("home win exact", () => {
    const r = calculateMatchPoints({ a: 2, b: 1 }, { a: 2, b: 1 }, false);
    expect(r.basePoints).toBe(7);
    expect(r.finalPoints).toBe(7);
    expect(r.scoringMethod).toBe("exact");
  });

  it("away win exact", () => {
    const r = calculateMatchPoints({ a: 0, b: 3 }, { a: 0, b: 3 }, false);
    expect(r.basePoints).toBe(7);
    expect(r.scoringMethod).toBe("exact");
  });

  it("draw exact (0–0)", () => {
    const r = calculateMatchPoints({ a: 0, b: 0 }, { a: 0, b: 0 }, false);
    expect(r.basePoints).toBe(7);
    expect(r.scoringMethod).toBe("exact");
  });

  it("draw exact (1–1)", () => {
    const r = calculateMatchPoints({ a: 1, b: 1 }, { a: 1, b: 1 }, false);
    expect(r.basePoints).toBe(7);
    expect(r.scoringMethod).toBe("exact");
  });

  it("exact score doubles to 14 on multiplier", () => {
    const r = calculateMatchPoints({ a: 2, b: 0 }, { a: 2, b: 0 }, true);
    expect(r.basePoints).toBe(7);
    expect(r.multiplierFactor).toBe(2);
    expect(r.finalPoints).toBe(14);
  });
});

describe("calculateMatchPoints – correct winner AND correct gap (4 pts)", () => {
  it("predicted 3–1 (home win, gap 2), actual 2–0 (home win, gap 2)", () => {
    const r = calculateMatchPoints({ a: 3, b: 1 }, { a: 2, b: 0 }, false);
    expect(r.basePoints).toBe(4);
    expect(r.scoringMethod).toBe("trend_and_gap");
  });

  it("predicted 0–2, actual 1–3 (both away wins, gap 2)", () => {
    const r = calculateMatchPoints({ a: 0, b: 2 }, { a: 1, b: 3 }, false);
    expect(r.basePoints).toBe(4);
    expect(r.scoringMethod).toBe("trend_and_gap");
  });

  it("predicted 2–2, actual 1–1 (both draws, gap 0)", () => {
    const r = calculateMatchPoints({ a: 2, b: 2 }, { a: 1, b: 1 }, false);
    expect(r.basePoints).toBe(4);
    expect(r.scoringMethod).toBe("trend_and_gap");
  });

  it("doubles to 8 on multiplier", () => {
    const r = calculateMatchPoints({ a: 3, b: 1 }, { a: 2, b: 0 }, true);
    expect(r.finalPoints).toBe(8);
  });
});

describe("calculateMatchPoints – correct winner OR correct gap (3 pts)", () => {
  it("correct winner, wrong gap (predicted 2–0 gap 2, actual 1–0 gap 1)", () => {
    const r = calculateMatchPoints({ a: 2, b: 0 }, { a: 1, b: 0 }, false);
    expect(r.basePoints).toBe(3);
    expect(r.scoringMethod).toBe("winner_or_gap");
  });

  it("wrong winner, same gap (predicted 2–0 home win gap 2, actual 0–2 away win gap 2)", () => {
    const r = calculateMatchPoints({ a: 2, b: 0 }, { a: 0, b: 2 }, false);
    expect(r.basePoints).toBe(3);
    expect(r.scoringMethod).toBe("winner_or_gap");
  });

  it("predicted draw, actual home win — only gap matches (both 0?)", () => {
    // predicted 1–1 (draw, gap 0), actual 2–1 (home win, gap 1) → neither matches
    const r = calculateMatchPoints({ a: 1, b: 1 }, { a: 2, b: 1 }, false);
    expect(r.basePoints).toBe(0);
  });

  it("predicted 1–0 (home win, gap 1), actual 2–2 (draw, gap 0) → only gap ≠, winner ≠ → 0", () => {
    const r = calculateMatchPoints({ a: 1, b: 0 }, { a: 2, b: 2 }, false);
    expect(r.basePoints).toBe(0);
  });

  it("doubles to 6 on multiplier", () => {
    const r = calculateMatchPoints({ a: 2, b: 0 }, { a: 1, b: 0 }, true);
    expect(r.finalPoints).toBe(6);
  });
});

describe("calculateMatchPoints – completely wrong (0 pts)", () => {
  it("predicted home win, actual away win, different gaps", () => {
    const r = calculateMatchPoints({ a: 2, b: 1 }, { a: 0, b: 3 }, false);
    expect(r.basePoints).toBe(0);
    expect(r.scoringMethod).toBe("wrong");
  });

  it("predicted draw, actual home win with gap 1", () => {
    const r = calculateMatchPoints({ a: 1, b: 1 }, { a: 2, b: 1 }, false);
    expect(r.basePoints).toBe(0);
    expect(r.scoringMethod).toBe("wrong");
  });

  it("0 pts still 0 on multiplier", () => {
    const r = calculateMatchPoints({ a: 2, b: 1 }, { a: 0, b: 3 }, true);
    expect(r.basePoints).toBe(0);
    expect(r.finalPoints).toBe(0);
  });
});

describe("calculateMatchPoints – multiplierFactor shape", () => {
  it("isMultiplier false → factor 1", () => {
    const r = calculateMatchPoints({ a: 1, b: 0 }, { a: 1, b: 0 }, false);
    expect(r.isMultiplier).toBe(false);
    expect(r.multiplierFactor).toBe(1);
  });

  it("isMultiplier true → factor 2", () => {
    const r = calculateMatchPoints({ a: 1, b: 0 }, { a: 1, b: 0 }, true);
    expect(r.isMultiplier).toBe(true);
    expect(r.multiplierFactor).toBe(2);
  });
});

// ─── calculateMultiplierUnion ────────────────────────────────────────────────

describe("calculateMultiplierUnion", () => {
  it("no overlap — all unique", () => {
    const r = calculateMultiplierUnion([[1, 2], [3, 4], [5, 6]]);
    expect(r.matchNumbers).toEqual([1, 2, 3, 4, 5, 6]);
    expect(r.totalMultiplierGames).toBe(6);
    expect(r.duplicateCount).toBe(0);
  });

  it("full overlap — all same picks", () => {
    const r = calculateMultiplierUnion([[5, 10], [5, 10], [5, 10]]);
    expect(r.matchNumbers).toEqual([5, 10]);
    expect(r.totalMultiplierGames).toBe(2);
    expect(r.duplicateCount).toBe(4); // 2 extra picks × 2 players
  });

  it("partial overlap", () => {
    const r = calculateMultiplierUnion([[1, 2], [2, 3]]);
    expect(r.matchNumbers).toEqual([1, 2, 3]);
    expect(r.totalMultiplierGames).toBe(3);
    expect(r.duplicateCount).toBe(1);
  });

  it("result is always sorted ascending", () => {
    const r = calculateMultiplierUnion([[10, 1], [5, 3]]);
    expect(r.matchNumbers).toEqual([1, 3, 5, 10]);
  });

  it("single player, no duplicates possible", () => {
    const r = calculateMultiplierUnion([[7, 42]]);
    expect(r.matchNumbers).toEqual([7, 42]);
    expect(r.duplicateCount).toBe(0);
  });

  it("empty input", () => {
    const r = calculateMultiplierUnion([]);
    expect(r.matchNumbers).toEqual([]);
    expect(r.totalMultiplierGames).toBe(0);
    expect(r.duplicateCount).toBe(0);
  });
});

// ─── PRIZE_PERCENTAGES ───────────────────────────────────────────────────────

describe("PRIZE_PERCENTAGES", () => {
  it("adds up to exactly 100%", () => {
    const { perGroup, overall, kingOfGoals, tournamentWinner } = PRIZE_PERCENTAGES;
    const total = perGroup * 12 + overall + kingOfGoals + tournamentWinner;
    expect(total).toBeCloseTo(1.0);
  });

  it("12 groups × 5% = 60%", () => {
    expect(PRIZE_PERCENTAGES.perGroup * 12).toBeCloseTo(0.6);
  });
});
