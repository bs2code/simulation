import { describe, expect, it } from "vitest";
import { runSimulationBatch } from "../runSimulationBatch";
import { buildFullTeam } from "@/engine/__tests__/testHelpers";

describe("runSimulationBatch", () => {
  it("aggregates win rates, average turns, and average survivors across the batch", () => {
    const summary = runSimulationBatch(buildFullTeam("A"), buildFullTeam("B"), 1, 15, {
      playerDifficulty: "expert",
      opponentDifficulty: "easy",
    });

    expect(summary.results).toHaveLength(15);
    expect(summary.playerWinRate + summary.opponentWinRate + summary.drawRate).toBeCloseTo(1);
    expect(summary.averageTurns).toBeGreaterThan(0);
    expect(summary.averageSurvivorsPlayer).toBeGreaterThanOrEqual(0);
    expect(summary.averageSurvivorsOpponent).toBeGreaterThanOrEqual(0);
  });

  it("an Expert AI should win a clear majority against Easy over enough games", () => {
    const summary = runSimulationBatch(buildFullTeam("A"), buildFullTeam("B"), 100, 30, {
      playerDifficulty: "expert",
      opponentDifficulty: "easy",
    });
    expect(summary.playerWinRate).toBeGreaterThan(0.5);
  });

  it("each individual seed in the batch reproduces the same result as simulating it alone", () => {
    const batch = runSimulationBatch(buildFullTeam("A"), buildFullTeam("B"), 42, 5, {
      playerDifficulty: "normal",
      opponentDifficulty: "normal",
    });
    // Re-run seed 42 (the batch's first seed) directly and compare.
    const solo = runSimulationBatch(buildFullTeam("A"), buildFullTeam("B"), 42, 1, {
      playerDifficulty: "normal",
      opponentDifficulty: "normal",
    });
    expect(batch.results[0]).toEqual(solo.results[0]);
  });
});
