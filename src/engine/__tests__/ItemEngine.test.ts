import { describe, expect, it } from "vitest";
import {
  getItemDamageMultiplier,
  getItemEndOfTurnHealFraction,
  getItemRecoilAfterAttackFraction,
  getItemTypePowerBoost,
  hasSurviveLethalHit,
} from "../ItemEngine";
import { buildPokemon } from "./testHelpers";

describe("ItemEngine", () => {
  it("Leftovers heals 1/16 max HP at end of turn", () => {
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"], 50, { item: "leftovers" });
    expect(getItemEndOfTurnHealFraction(blastoise)).toBeCloseTo(1 / 16);
  });

  it("a Pokémon holding nothing gets no item effects", () => {
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    expect(getItemEndOfTurnHealFraction(blastoise)).toBe(0);
    expect(getItemDamageMultiplier(blastoise)).toBe(1);
    expect(hasSurviveLethalHit(blastoise)).toBe(false);
  });

  it("Life Orb boosts damage and causes recoil after attacking", () => {
    const charizard = buildPokemon("charizard", "charizard", ["ember"], 50, { item: "life-orb" });
    expect(getItemDamageMultiplier(charizard)).toBe(1.3);
    expect(getItemRecoilAfterAttackFraction(charizard)).toBeCloseTo(0.1);
  });

  it("Charcoal boosts Fire moves but not other types", () => {
    const charizard = buildPokemon("charizard", "charizard", ["ember"], 50, { item: "charcoal" });
    expect(getItemTypePowerBoost(charizard, "Fire")).toBeCloseTo(1.2);
    expect(getItemTypePowerBoost(charizard, "Flying")).toBe(1);
  });

  it("Focus Sash lets its holder survive a lethal hit", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"], 50, { item: "focus-sash" });
    expect(hasSurviveLethalHit(pikachu)).toBe(true);
  });
});
