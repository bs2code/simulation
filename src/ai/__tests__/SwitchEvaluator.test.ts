import { describe, expect, it } from "vitest";
import { SwitchEvaluator } from "../SwitchEvaluator";
import { createBattleSide } from "@/types/battle";
import { buildPokemon } from "@/engine/__tests__/testHelpers";

describe("SwitchEvaluator.evaluateSwitchOptions", () => {
  it("excludes the currently active Pokémon and any fainted teammates", () => {
    const evaluator = new SwitchEvaluator();
    const active = buildPokemon("active", "charizard", ["ember"]);
    const fainted = buildPokemon("fainted", "pikachu", ["thunderbolt"]);
    fainted.fainted = true;
    const healthy = buildPokemon("healthy", "blastoise", ["water-gun"]);
    const side = createBattleSide([active, fainted, healthy]);
    const opponent = buildPokemon("opp", "venusaur", ["tackle"]);

    const options = evaluator.evaluateSwitchOptions(side, opponent);
    expect(options.map((o) => o.pokemonId)).toEqual(["healthy"]);
  });

  it("computes the worst incoming multiplier from the opponent's actual move types", () => {
    const evaluator = new SwitchEvaluator();
    const active = buildPokemon("active", "charizard", ["ember"]);
    // Blastoise (Water) resists Fire; Venusaur (Grass/Poison) is weak to Fire.
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    const venusaur = buildPokemon("venusaur", "venusaur", ["tackle"]);
    const side = createBattleSide([active, blastoise, venusaur]);
    const opponent = buildPokemon("opp-charizard", "charizard", ["ember"]); // attacks with Fire

    const options = evaluator.evaluateSwitchOptions(side, opponent);
    const blastoiseScore = options.find((o) => o.pokemonId === "blastoise")!;
    const venusaurScore = options.find((o) => o.pokemonId === "venusaur")!;
    expect(blastoiseScore.worstIncomingMultiplier).toBe(0.5);
    expect(venusaurScore.worstIncomingMultiplier).toBe(2);
    expect(blastoiseScore.score).toBeGreaterThan(venusaurScore.score);
  });

  it("computes the best outgoing multiplier from the candidate's own move types", () => {
    const evaluator = new SwitchEvaluator();
    const active = buildPokemon("active", "pikachu", ["thunderbolt"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]); // Water vs Fire/Flying opp = 2x
    const side = createBattleSide([active, blastoise]);
    const opponentCharizard = buildPokemon("opp", "charizard", ["ember"]);

    const options = evaluator.evaluateSwitchOptions(side, opponentCharizard);
    expect(options[0].bestOutgoingMultiplier).toBe(2);
  });

  it("an ability granting immunity zeroes out the incoming multiplier for that type", () => {
    const evaluator = new SwitchEvaluator();
    const active = buildPokemon("active", "charizard", ["ember"]);
    const levitateGengar = buildPokemon("gengar", "gengar", ["shadow-ball"], 50, { ability: "levitate" });
    const side = createBattleSide([active, levitateGengar]);
    const groundAttacker = buildPokemon("opp", "charizard", ["earthquake"]);

    const options = evaluator.evaluateSwitchOptions(side, groundAttacker);
    expect(options[0].worstIncomingMultiplier).toBe(0);
  });

  it("sorts candidates best-first", () => {
    const evaluator = new SwitchEvaluator();
    const active = buildPokemon("active", "charizard", ["ember"]);
    const great = buildPokemon("great", "blastoise", ["water-gun"]);
    const bad = buildPokemon("bad", "venusaur", ["tackle"]);
    const side = createBattleSide([active, bad, great]);
    const opponent = buildPokemon("opp", "charizard", ["ember"]);

    const options = evaluator.evaluateSwitchOptions(side, opponent);
    expect(options[0].pokemonId).toBe("great");
  });
});

describe("SwitchEvaluator.evaluateSwitchOptionsAgainstTeam", () => {
  it("averages matchup quality across the opponent's whole living team, not just the active one", () => {
    const evaluator = new SwitchEvaluator();
    const active = buildPokemon("active", "charizard", ["ember"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    const side = createBattleSide([active, blastoise]);

    // One Fire-type opponent (Blastoise resists) and one Electric-type opponent (neutral to Water
    // defensively, and Blastoise's Water move is neutral against it too).
    const opponentTeam = [
      buildPokemon("opp-charizard", "charizard", ["ember"]),
      buildPokemon("opp-pikachu", "pikachu", ["thunderbolt"]),
    ];

    const options = evaluator.evaluateSwitchOptionsAgainstTeam(side, opponentTeam);
    const blastoiseOption = options.find((o) => o.pokemonId === "blastoise")!;
    // Average of 0.5 (vs Fire) and 2 (Electric vs Water) = 1.25 — averaging changes the number
    // versus evaluating against a single opponent.
    expect(blastoiseOption.worstIncomingMultiplier).toBeCloseTo(1.25);
  });

  it("ignores fainted opponents when averaging", () => {
    const evaluator = new SwitchEvaluator();
    const active = buildPokemon("active", "charizard", ["ember"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    const side = createBattleSide([active, blastoise]);

    const faintedCharizard = buildPokemon("opp-charizard", "charizard", ["ember"]);
    faintedCharizard.fainted = true;
    const opponentTeam = [faintedCharizard, buildPokemon("opp-pikachu", "pikachu", ["thunderbolt"])];

    const options = evaluator.evaluateSwitchOptionsAgainstTeam(side, opponentTeam);
    const blastoiseOption = options.find((o) => o.pokemonId === "blastoise")!;
    expect(blastoiseOption.worstIncomingMultiplier).toBe(2); // only the living Pikachu counted
  });
});
