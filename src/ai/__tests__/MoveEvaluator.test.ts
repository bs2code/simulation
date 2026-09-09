import { describe, expect, it } from "vitest";
import { MoveEvaluator } from "../MoveEvaluator";
import { getMove } from "@/data/moves";
import { buildPokemon } from "@/engine/__tests__/testHelpers";

describe("MoveEvaluator.evaluateMove", () => {
  it("flags a move as lethal when its estimated damage meets or exceeds the defender's current HP", () => {
    const evaluator = new MoveEvaluator();
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"], 100);
    const weakling = buildPokemon("weakling", "venusaur", ["tackle"], 1);
    const score = evaluator.evaluateMove(charizard, weakling, getMove("flamethrower"));
    expect(score.isLethal).toBe(true);
    expect(score.expectedDamage).toBeGreaterThan(0);
  });

  it("status moves deal no estimated damage and are never lethal", () => {
    const evaluator = new MoveEvaluator();
    const venusaur = buildPokemon("venusaur", "venusaur", ["growl"]);
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"]);
    const score = evaluator.evaluateMove(venusaur, charizard, getMove("growl"));
    expect(score.expectedDamage).toBe(0);
    expect(score.isLethal).toBe(false);
  });

  it("reflects a move's accuracy as a 0-1 hit chance, and undefined accuracy as certain", () => {
    const evaluator = new MoveEvaluator();
    const blastoise = buildPokemon("blastoise", "blastoise", ["hydro-pump"]);
    const venusaur = buildPokemon("venusaur", "venusaur", ["swords-dance"]);
    expect(evaluator.evaluateMove(blastoise, venusaur, getMove("hydro-pump")).hitChance).toBeCloseTo(0.8);
    expect(evaluator.evaluateMove(blastoise, venusaur, getMove("swords-dance")).hitChance).toBe(1);
  });

  it("scores a super-effective move higher than a resisted one, all else equal", () => {
    const evaluator = new MoveEvaluator();
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    const charizard = buildPokemon("charizard", "charizard", ["ember"]); // Fire/Flying: weak to Water
    const venusaur = buildPokemon("venusaur", "venusaur", ["tackle"]); // Grass/Poison: resists Water

    const superEffective = evaluator.evaluateMove(blastoise, charizard, getMove("water-gun"));
    const resisted = evaluator.evaluateMove(blastoise, venusaur, getMove("water-gun"));

    expect(superEffective.effectiveness).toBeGreaterThan(resisted.effectiveness);
    expect(superEffective.score).toBeGreaterThan(resisted.score);
  });

  it("detects a self-targeted positive stat change (Swords Dance)", () => {
    const evaluator = new MoveEvaluator();
    const venusaur = buildPokemon("venusaur", "venusaur", ["swords-dance"]);
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const score = evaluator.evaluateMove(venusaur, charizard, getMove("swords-dance"));
    expect(score.hasPositiveStatChangeForSelf).toBe(true);
  });

  it("detects a status-inflicting move against a currently healthy target", () => {
    const evaluator = new MoveEvaluator();
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunder-wave"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    expect(evaluator.evaluateMove(pikachu, blastoise, getMove("thunder-wave")).inflictsStatus).toBe(true);

    blastoise.status = { condition: "paralysis" };
    expect(evaluator.evaluateMove(pikachu, blastoise, getMove("thunder-wave")).inflictsStatus).toBe(false);
  });

  it("gives a higher-priority move a scoring bonus over an equal-power, equal-type normal-priority move", () => {
    const evaluator = new MoveEvaluator();
    const pikachu = buildPokemon("pikachu", "pikachu", ["quick-attack", "tackle"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const quickAttack = evaluator.evaluateMove(pikachu, blastoise, getMove("quick-attack"));
    const tackle = evaluator.evaluateMove(pikachu, blastoise, getMove("tackle"));
    // Same power (40), same type (Normal) — priority is the only meaningful difference.
    expect(quickAttack.score).toBeGreaterThan(tackle.score);
  });

  it("rankMoves sorts best-scoring move first, and a lethal move outranks a non-lethal one", () => {
    const evaluator = new MoveEvaluator();
    const charizard = buildPokemon("charizard", "charizard", ["ember", "swords-dance"], 100);
    const weakling = buildPokemon("weakling", "venusaur", ["tackle"], 1);
    const ranked = evaluator.rankMoves(charizard, weakling, [getMove("ember"), getMove("swords-dance")]);
    expect(ranked[0].moveId).toBe("ember");
    expect(ranked[0].isLethal).toBe(true);
  });

  it("never mutates the attacker or defender it's given", () => {
    const evaluator = new MoveEvaluator();
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const before = JSON.stringify([charizard, blastoise]);
    evaluator.evaluateMove(charizard, blastoise, getMove("ember"));
    expect(JSON.stringify([charizard, blastoise])).toBe(before);
  });
});
