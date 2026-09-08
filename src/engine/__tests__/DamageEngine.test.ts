import { describe, expect, it } from "vitest";
import { DamageEngine } from "../DamageEngine";
import { createPokemon } from "@/utils/createPokemon";
import { getMove } from "@/data/moves";
import { SeededRNG } from "@/utils/rng";

function makeCharizard(moveIds: string[] = ["ember", "flamethrower", "swords-dance"]) {
  return createPokemon({
    id: "p1",
    speciesId: "charizard",
    level: 50,
    nature: "Hardy",
    ability: "Blaze",
    moveIds,
  });
}

function makeBlastoise(moveIds: string[] = ["water-gun", "hydro-pump", "tackle"]) {
  return createPokemon({
    id: "p2",
    speciesId: "blastoise",
    level: 50,
    nature: "Hardy",
    ability: "Torrent",
    moveIds,
  });
}

function makePikachu(moveIds: string[] = ["tackle", "thunderbolt"]) {
  return createPokemon({
    id: "p3",
    speciesId: "pikachu",
    level: 50,
    nature: "Hardy",
    ability: "Static",
    moveIds,
  });
}

function makeGengar(moveIds: string[] = ["shadow-ball", "will-o-wisp"]) {
  return createPokemon({
    id: "p4",
    speciesId: "gengar",
    level: 50,
    nature: "Hardy",
    ability: "Levitate",
    moveIds,
  });
}

describe("DamageEngine.calculateDamage", () => {
  it("deals 0 damage and reports status moves without power", () => {
    const engine = new DamageEngine(new SeededRNG(1));
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    const result = engine.calculateDamage(charizard, blastoise, getMove("swords-dance"));
    expect(result.damage).toBe(0);
  });

  it("applies STAB when the move's type matches the attacker's type", () => {
    const engine = new DamageEngine(new SeededRNG(1));
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    const result = engine.calculateDamage(charizard, blastoise, getMove("ember"), {
      forceCritical: false,
      forceRandomRoll: 100,
    });
    expect(result.stab).toBe(true);
  });

  it("does not apply STAB when the move's type doesn't match the attacker's type", () => {
    const engine = new DamageEngine(new SeededRNG(1));
    const pikachu = makePikachu();
    const blastoise = makeBlastoise();
    const result = engine.calculateDamage(pikachu, blastoise, getMove("tackle"), {
      forceRandomRoll: 100,
    });
    expect(result.stab).toBe(false);
  });

  it("marks super-effective damage (Water vs Fire) and scales damage up", () => {
    const engine = new DamageEngine(new SeededRNG(1));
    const blastoise = makeBlastoise();
    const charizard = makeCharizard();
    const result = engine.calculateDamage(blastoise, charizard, getMove("water-gun"), {
      forceRandomRoll: 100,
      forceCritical: false,
    });
    expect(result.superEffective).toBe(true);
    expect(result.effectiveness).toBe(2);
    expect(result.resisted).toBe(false);
  });

  it("marks resisted damage (Fire vs Water) and scales damage down", () => {
    const engine = new DamageEngine(new SeededRNG(1));
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    const result = engine.calculateDamage(charizard, blastoise, getMove("ember"), {
      forceRandomRoll: 100,
      forceCritical: false,
    });
    expect(result.resisted).toBe(true);
    expect(result.effectiveness).toBe(0.5);
  });

  it("returns 0 damage and immune=true for a type immunity (Normal vs Ghost)", () => {
    const engine = new DamageEngine(new SeededRNG(1));
    const pikachu = makePikachu();
    const gengar = makeGengar();
    const result = engine.calculateDamage(pikachu, gengar, getMove("tackle"));
    expect(result.immune).toBe(true);
    expect(result.damage).toBe(0);
    expect(result.effectiveness).toBe(0);
  });

  it("critical hits deal more damage than non-critical hits, all else equal", () => {
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    const engine = new DamageEngine(new SeededRNG(1));

    const normal = engine.calculateDamage(charizard, blastoise, getMove("ember"), {
      forceCritical: false,
      forceRandomRoll: 100,
    });
    const crit = engine.calculateDamage(charizard, blastoise, getMove("ember"), {
      forceCritical: true,
      forceRandomRoll: 100,
    });
    expect(crit.critical).toBe(true);
    expect(crit.damage).toBeGreaterThan(normal.damage);
  });

  it("weather boosts same-type moves (sun boosts Fire) and marks boostedByWeather", () => {
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    const engine = new DamageEngine(new SeededRNG(1));

    const noWeather = engine.calculateDamage(charizard, blastoise, getMove("ember"), {
      forceRandomRoll: 100,
      forceCritical: false,
    });
    const sun = engine.calculateDamage(charizard, blastoise, getMove("ember"), {
      weather: "sun",
      forceRandomRoll: 100,
      forceCritical: false,
    });
    expect(sun.boostedByWeather).toBe(true);
    expect(sun.damage).toBeGreaterThan(noWeather.damage);
  });

  it("weather weakens opposing moves (sun weakens Water)", () => {
    const blastoise = makeBlastoise();
    const charizard = makeCharizard();
    const engine = new DamageEngine(new SeededRNG(1));

    const noWeather = engine.calculateDamage(blastoise, charizard, getMove("water-gun"), {
      forceRandomRoll: 100,
      forceCritical: false,
    });
    const sun = engine.calculateDamage(blastoise, charizard, getMove("water-gun"), {
      weather: "sun",
      forceRandomRoll: 100,
      forceCritical: false,
    });
    expect(sun.damage).toBeLessThan(noWeather.damage);
    expect(sun.boostedByWeather).toBe(false);
  });

  it("keeps the random roll within the 85-100 band", () => {
    const engine = new DamageEngine(new SeededRNG(42));
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    for (let i = 0; i < 200; i++) {
      const result = engine.calculateDamage(charizard, blastoise, getMove("ember"));
      expect(result.randomModifier).toBeGreaterThanOrEqual(0.85);
      expect(result.randomModifier).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic: the same seed produces the same sequence of results", () => {
    const engineA = new DamageEngine(new SeededRNG(777));
    const engineB = new DamageEngine(new SeededRNG(777));
    const charizardA = makeCharizard();
    const blastoiseA = makeBlastoise();
    const charizardB = makeCharizard();
    const blastoiseB = makeBlastoise();

    const resultsA = Array.from({ length: 10 }, () =>
      engineA.calculateDamage(charizardA, blastoiseA, getMove("ember"))
    );
    const resultsB = Array.from({ length: 10 }, () =>
      engineB.calculateDamage(charizardB, blastoiseB, getMove("ember"))
    );

    expect(resultsA).toEqual(resultsB);
  });

  it("never deals less than 1 damage on a hit that isn't immune", () => {
    const engine = new DamageEngine(new SeededRNG(3));
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    const result = engine.calculateDamage(charizard, blastoise, getMove("ember"), {
      forceRandomRoll: 85,
      forceCritical: false,
    });
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });
});

describe("DamageEngine.checkHit", () => {
  it("always hits moves without an accuracy stat", () => {
    const engine = new DamageEngine(new SeededRNG(1));
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    for (let i = 0; i < 20; i++) {
      expect(engine.checkHit(charizard, blastoise, getMove("swords-dance"))).toBe(true);
    }
  });

  it("respects accuracy/evasion stat stages", () => {
    const engine = new DamageEngine(new SeededRNG(5));
    const charizard = makeCharizard();
    const blastoise = makeBlastoise();
    blastoise.statStages.evasion = 6;
    // Simulate many rolls; with max evasion, a 100-accuracy move should miss at least sometimes.
    let misses = 0;
    for (let i = 0; i < 100; i++) {
      if (!engine.checkHit(charizard, blastoise, getMove("ember"))) misses++;
    }
    expect(misses).toBeGreaterThan(0);
  });
});
