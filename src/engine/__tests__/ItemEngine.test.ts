import { describe, expect, it } from "vitest";
import {
  getChoiceLockedMoveId,
  getItemDamageMultiplier,
  getItemEndOfTurnHealFraction,
  getItemOffensiveStatMultiplier,
  getItemRecoilAfterAttackFraction,
  getItemSpeedMultiplier,
  getItemTypePowerBoost,
  hasSurviveLethalHit,
  lockChoiceItemMove,
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

  it("Choice Band boosts physical damage 1.5x but not special", () => {
    const charizard = buildPokemon("charizard", "charizard", ["ember"], 50, { item: "choice-band" });
    expect(getItemOffensiveStatMultiplier(charizard, "physical")).toBe(1.5);
    expect(getItemOffensiveStatMultiplier(charizard, "special")).toBe(1);
    expect(getItemOffensiveStatMultiplier(charizard, "status")).toBe(1);
  });

  it("Choice Specs boosts special damage 1.5x but not physical", () => {
    const charizard = buildPokemon("charizard", "charizard", ["ember"], 50, { item: "choice-specs" });
    expect(getItemOffensiveStatMultiplier(charizard, "special")).toBe(1.5);
    expect(getItemOffensiveStatMultiplier(charizard, "physical")).toBe(1);
  });

  it("Choice Scarf boosts Speed 1.5x", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"], 50, { item: "choice-scarf" });
    expect(getItemSpeedMultiplier(pikachu)).toBe(1.5);
  });

  it("a Choice item holder isn't locked into anything until it uses a move", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt", "quick-attack"], 50, { item: "choice-band" });
    expect(getChoiceLockedMoveId(pikachu)).toBeUndefined();
  });

  it("lockChoiceItemMove locks a Choice item holder into the move it just used", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt", "quick-attack"], 50, { item: "choice-band" });
    lockChoiceItemMove(pikachu, "thunderbolt");
    expect(getChoiceLockedMoveId(pikachu)).toBe("thunderbolt");
  });

  it("lockChoiceItemMove is a no-op for a Pokémon not holding a Choice item", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"], 50, { item: "leftovers" });
    lockChoiceItemMove(pikachu, "thunderbolt");
    expect(getChoiceLockedMoveId(pikachu)).toBeUndefined();
  });
});
