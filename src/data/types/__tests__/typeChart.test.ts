import { describe, expect, it } from "vitest";
import { getTypeMultiplier } from "../typeChart";

describe("getTypeMultiplier", () => {
  it("returns 2x for a super-effective single type matchup", () => {
    expect(getTypeMultiplier("Water", ["Fire"])).toBe(2);
  });

  it("returns 0.5x for a resisted single type matchup", () => {
    expect(getTypeMultiplier("Fire", ["Water"])).toBe(0.5);
  });

  it("returns 1x for a neutral matchup", () => {
    expect(getTypeMultiplier("Normal", ["Grass"])).toBe(1);
  });

  it("returns 0x for an immunity", () => {
    expect(getTypeMultiplier("Normal", ["Ghost"])).toBe(0);
  });

  it("returns 0.25x for a dual-resisted matchup (quad resist)", () => {
    expect(getTypeMultiplier("Fighting", ["Ghost", "Normal"])).toBe(0);
    expect(getTypeMultiplier("Grass", ["Fire", "Flying"])).toBe(0.25);
  });

  it("returns 4x for a dual-weak matchup", () => {
    expect(getTypeMultiplier("Ice", ["Grass", "Dragon"])).toBe(4);
  });

  it("multiplies across both defender types independently", () => {
    // Electric vs Water/Flying: 2x (Water) * 2x (Flying) = 4x
    expect(getTypeMultiplier("Electric", ["Water", "Flying"])).toBe(4);
  });

  it("a 0x immunity against one type overrides any weakness against the other", () => {
    // Ground vs Flying (immune) / Rock (weak): still 0
    expect(getTypeMultiplier("Ground", ["Flying", "Rock"])).toBe(0);
  });
});
