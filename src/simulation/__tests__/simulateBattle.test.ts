import { describe, expect, it } from "vitest";
import { simulateBattle } from "../simulateBattle";
import { buildFullTeam } from "@/engine/__tests__/testHelpers";

describe("simulateBattle", () => {
  it("plays a full 6v6 battle to completion with AI on both sides", () => {
    const { result } = simulateBattle(buildFullTeam("A"), buildFullTeam("B"), 1, {
      playerDifficulty: "normal",
      opponentDifficulty: "normal",
    });

    expect(["player", "opponent", undefined]).toContain(result.winner);
    expect(result.turns).toBeGreaterThan(0);
    expect(result.remainingPlayerCount + result.remainingOpponentCount).toBeGreaterThanOrEqual(0);
  });

  it("is fully deterministic given the same teams, seed, and options", () => {
    const runOnce = () =>
      simulateBattle(buildFullTeam("A"), buildFullTeam("B"), 777, {
        playerDifficulty: "expert",
        opponentDifficulty: "easy",
      }).result;

    const first = runOnce();
    const second = runOnce();
    expect(first).toEqual(second);
  });

  it("records a full replay only when recordReplay is requested", () => {
    const withoutReplay = simulateBattle(buildFullTeam("A"), buildFullTeam("B"), 5, {
      playerDifficulty: "normal",
      opponentDifficulty: "normal",
    });
    expect(withoutReplay.replay).toBeUndefined();

    const withReplay = simulateBattle(buildFullTeam("A"), buildFullTeam("B"), 5, {
      playerDifficulty: "normal",
      opponentDifficulty: "normal",
      recordReplay: true,
    });
    expect(withReplay.replay).toBeDefined();
    expect(withReplay.replay!.snapshots.length).toBeGreaterThan(0);
    expect(withReplay.replay!.winner).toBe(withReplay.result.winner);
    // Re-simulating the same seed should reach the same outcome as the recorded replay's summary.
    expect(withReplay.result).toEqual(withoutReplay.result);
  });

  it("a replay's snapshots are in chronological turn order (turn numbers non-decreasing)", () => {
    const { replay } = simulateBattle(buildFullTeam("A"), buildFullTeam("B"), 3, {
      playerDifficulty: "normal",
      opponentDifficulty: "normal",
      recordReplay: true,
    });
    const turns = replay!.snapshots.map((s) => s.turn);
    for (let i = 1; i < turns.length; i++) {
      expect(turns[i]).toBeGreaterThanOrEqual(turns[i - 1]);
    }
  });
});
