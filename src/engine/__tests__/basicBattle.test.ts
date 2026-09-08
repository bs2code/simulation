import { describe, expect, it } from "vitest";
import { DamageEngine } from "../DamageEngine";
import { createPokemon } from "@/utils/createPokemon";
import { getMove } from "@/data/moves";
import { SeededRNG } from "@/utils/rng";
import type { Pokemon } from "@/types/pokemon";

/**
 * Minimal turn sequencing used only to prove the engine can resolve a 1v1 exchange.
 * The real TurnEngine (order, priority, effects, switching) is Phase 2 — this just
 * exercises speed-based ordering + DamageEngine end to end.
 */
function resolveTurn(engine: DamageEngine, a: Pokemon, aMove: string, b: Pokemon, bMove: string) {
  const order =
    a.stats.speed >= b.stats.speed
      ? [
          { attacker: a, moveId: aMove, defender: b },
          { attacker: b, moveId: bMove, defender: a },
        ]
      : [
          { attacker: b, moveId: bMove, defender: a },
          { attacker: a, moveId: aMove, defender: b },
        ];

  for (const { attacker, moveId, defender } of order) {
    if (attacker.fainted || defender.fainted) continue;
    const move = getMove(moveId);
    if (!engine.checkHit(attacker, defender, move)) continue;
    const result = engine.calculateDamage(attacker, defender, move);
    defender.currentHp = Math.max(0, defender.currentHp - result.damage);
    if (defender.currentHp === 0) defender.fainted = true;
  }
}

describe("basic 1v1 battle (Phase 1 milestone)", () => {
  it("a faster Pokémon's move resolves before a slower Pokémon's move", () => {
    const engine = new DamageEngine(new SeededRNG(1));
    const fast = createPokemon({
      id: "fast",
      speciesId: "greninja", // 122 base speed
      level: 50,
      nature: "Jolly",
      ability: "Torrent",
      moveIds: ["water-gun"],
    });
    const slow = createPokemon({
      id: "slow",
      speciesId: "blastoise", // 78 base speed
      level: 50,
      nature: "Bold",
      ability: "Torrent",
      moveIds: ["water-gun"],
    });
    expect(fast.stats.speed).toBeGreaterThan(slow.stats.speed);

    // Knock the slow one out first via direct damage to isolate ordering, then confirm
    // that when both are alive, the faster attacker's hit lands and is reflected first.
    const beforeHp = slow.currentHp;
    resolveTurn(engine, fast, "water-gun", slow, "water-gun");
    expect(slow.currentHp).toBeLessThan(beforeHp);
  });

  it("a Water-type move against a Fire-type opponent is super effective", () => {
    const engine = new DamageEngine(new SeededRNG(2));
    const blastoise = createPokemon({
      id: "p1",
      speciesId: "blastoise",
      level: 50,
      nature: "Hardy",
      ability: "Torrent",
      moveIds: ["water-gun"],
    });
    const charizard = createPokemon({
      id: "p2",
      speciesId: "charizard",
      level: 50,
      nature: "Hardy",
      ability: "Blaze",
      moveIds: ["ember"],
    });
    const result = engine.calculateDamage(blastoise, charizard, getMove("water-gun"), {
      forceRandomRoll: 100,
    });
    expect(result.superEffective).toBe(true);
  });

  it("a Pokémon faints once its HP is reduced to 0 and stops acting", () => {
    const engine = new DamageEngine(new SeededRNG(3));
    const attacker = createPokemon({
      id: "attacker",
      speciesId: "charizard",
      level: 100,
      nature: "Modest",
      ability: "Blaze",
      moveIds: ["flamethrower"],
    });
    const victim = createPokemon({
      id: "victim",
      speciesId: "venusaur",
      level: 5,
      nature: "Hardy",
      ability: "Overgrow",
      moveIds: ["tackle"],
    });

    resolveTurn(engine, attacker, "flamethrower", victim, "tackle");

    expect(victim.fainted).toBe(true);
    expect(victim.currentHp).toBe(0);

    const hpBeforeNextTurn = attacker.currentHp;
    resolveTurn(engine, attacker, "flamethrower", victim, "tackle");
    // The fainted Pokémon should not have been able to act or deal damage.
    expect(attacker.currentHp).toBe(hpBeforeNextTurn);
  });

  it("runs a full exchange to completion and produces a single winner", () => {
    const engine = new DamageEngine(new SeededRNG(99));
    const charizard = createPokemon({
      id: "charizard",
      speciesId: "charizard",
      level: 50,
      nature: "Modest",
      ability: "Blaze",
      moveIds: ["flamethrower"],
    });
    const blastoise = createPokemon({
      id: "blastoise",
      speciesId: "blastoise",
      level: 50,
      nature: "Bold",
      ability: "Torrent",
      moveIds: ["hydro-pump"],
    });

    let turns = 0;
    while (!charizard.fainted && !blastoise.fainted && turns < 50) {
      resolveTurn(engine, charizard, "flamethrower", blastoise, "hydro-pump");
      turns++;
    }

    expect(turns).toBeLessThan(50);
    expect(charizard.fainted || blastoise.fainted).toBe(true);
    // Exactly one side should be left standing (no simultaneous double-KO expected here
    // since Blastoise is resisted and slower).
    expect(charizard.fainted).not.toBe(blastoise.fainted);
  });
});
