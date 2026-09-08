import { describe, expect, it } from "vitest";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/types/pokemon";
import {
  calculateStats,
  getAccuracyStageMultiplier,
  getStatStageMultiplier,
} from "../statCalculator";

const CHARIZARD_BASE = {
  hp: 78,
  attack: 84,
  defense: 78,
  specialAttack: 109,
  specialDefense: 85,
  speed: 100,
};

describe("calculateStats", () => {
  it("matches the known level-100 stat spread for a neutral nature, max IVs, 0 EVs", () => {
    const stats = calculateStats(CHARIZARD_BASE, 100, "Hardy", DEFAULT_IVS, DEFAULT_EVS);
    expect(stats.hp).toBe(297);
    expect(stats.attack).toBe(204);
    expect(stats.defense).toBe(192);
    expect(stats.specialAttack).toBe(254);
    expect(stats.specialDefense).toBe(206);
    expect(stats.speed).toBe(236);
  });

  it("applies a +10% nature boost and -10% nature drop", () => {
    const neutral = calculateStats(CHARIZARD_BASE, 100, "Hardy", DEFAULT_IVS, DEFAULT_EVS);
    const modest = calculateStats(CHARIZARD_BASE, 100, "Modest", DEFAULT_IVS, DEFAULT_EVS);
    expect(modest.specialAttack).toBeGreaterThan(neutral.specialAttack);
    expect(modest.attack).toBeLessThan(neutral.attack);
    // HP is never affected by nature.
    expect(modest.hp).toBe(neutral.hp);
  });

  it("increases with level", () => {
    const level50 = calculateStats(CHARIZARD_BASE, 50, "Hardy", DEFAULT_IVS, DEFAULT_EVS);
    const level100 = calculateStats(CHARIZARD_BASE, 100, "Hardy", DEFAULT_IVS, DEFAULT_EVS);
    expect(level100.hp).toBeGreaterThan(level50.hp);
    expect(level100.attack).toBeGreaterThan(level50.attack);
  });

  it("increases with higher IVs", () => {
    const zeroIvs = calculateStats(
      CHARIZARD_BASE,
      100,
      "Hardy",
      { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      DEFAULT_EVS
    );
    const maxIvs = calculateStats(CHARIZARD_BASE, 100, "Hardy", DEFAULT_IVS, DEFAULT_EVS);
    expect(maxIvs.attack).toBeGreaterThan(zeroIvs.attack);
  });
});

describe("getStatStageMultiplier", () => {
  it("is 1x at stage 0", () => {
    expect(getStatStageMultiplier(0)).toBe(1);
  });

  it("doubles at +6", () => {
    expect(getStatStageMultiplier(6)).toBe(4);
  });

  it("quarters at -6", () => {
    expect(getStatStageMultiplier(-6)).toBe(0.25);
  });

  it("clamps beyond +/-6", () => {
    expect(getStatStageMultiplier(10)).toBe(getStatStageMultiplier(6));
    expect(getStatStageMultiplier(-10)).toBe(getStatStageMultiplier(-6));
  });
});

describe("getAccuracyStageMultiplier", () => {
  it("is 1x at stage 0", () => {
    expect(getAccuracyStageMultiplier(0)).toBe(1);
  });

  it("increases at positive stages", () => {
    expect(getAccuracyStageMultiplier(2)).toBeCloseTo(5 / 3);
  });

  it("decreases at negative stages", () => {
    expect(getAccuracyStageMultiplier(-2)).toBeCloseTo(3 / 5);
  });
});
