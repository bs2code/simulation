import { describe, expect, it } from "vitest";
import { BattleEngine } from "../BattleEngine";
import { SeededRNG } from "@/utils/rng";
import { buildPokemon } from "./testHelpers";

describe("TurnEngine: status effects in a real turn", () => {
  it("Thunder Wave paralyzes the target, which can then prevent it from acting", () => {
    const rng = new SeededRNG(7);
    const engine = new BattleEngine(rng);
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunder-wave"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([pikachu], [blastoise]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: pikachu.id, moveId: "thunder-wave" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );

    expect(next.sides.opponent.team[0].status.condition).toBe("paralysis");
    expect(next.log.some((e) => e.type === "status-applied" && e.status === "paralysis")).toBe(true);
  });

  it("a sleeping Pokémon cannot use its move", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.status = { condition: "sleep", counter: 3 };
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const state = engine.createBattle([blastoise], [charizard]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" },
      { type: "move", pokemonId: charizard.id, moveId: "ember" }
    );

    expect(next.log.some((e) => e.type === "move-prevented" && e.reason === "sleep")).toBe(true);
    expect(next.log.every((e) => !(e.type === "move-used" && e.pokemonId === blastoise.id))).toBe(true);
  });

  it("burn deals chip damage at the end of the turn", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.status = { condition: "burn" };
    const charizard = buildPokemon("charizard", "charizard", ["swords-dance"]);
    const state = engine.createBattle([blastoise], [charizard]);
    const hpBefore = blastoise.currentHp;

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" },
      { type: "move", pokemonId: charizard.id, moveId: "swords-dance" }
    );

    expect(next.sides.player.team[0].currentHp).toBeLessThan(hpBefore);
    expect(next.log.some((e) => e.type === "secondary-damage" && e.cause === "burn")).toBe(true);
  });

  it("Confuse Ray inflicts confusion via a full turn resolution", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const gengar = buildPokemon("gengar", "gengar", ["confuse-ray"], 50, { ability: "levitate" });
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([gengar], [blastoise]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: gengar.id, moveId: "confuse-ray" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );

    expect(next.sides.opponent.team[0].volatileStatuses.some((v) => v.id === "confusion")).toBe(true);
  });
});

describe("TurnEngine: abilities and items in a real turn", () => {
  it("Static has a chance to paralyze an attacker that made contact", () => {
    // Search for a seed where Static's 30% proc succeeds, to prove the hook actually fires.
    const pikachu = buildPokemon("pikachu", "pikachu", ["tackle"], 50, { ability: "static" });
    const charizard = buildPokemon("charizard", "charizard", ["tackle"]);

    let procced = false;
    for (let seed = 1; seed < 200 && !procced; seed++) {
      const rng = new SeededRNG(seed);
      const engine = new BattleEngine(rng);
      const state = engine.createBattle([charizard], [pikachu]);
      const next = engine.submitTurn(
        state,
        { type: "move", pokemonId: charizard.id, moveId: "tackle" },
        { type: "move", pokemonId: pikachu.id, moveId: "tackle" }
      );
      if (next.sides.player.team[0].status.condition === "paralysis") procced = true;
    }
    expect(procced).toBe(true);
  });

  it("Focus Sash lets a full-HP Pokémon survive a hit that would otherwise KO it", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"], 100);
    const venusaur = buildPokemon("venusaur", "venusaur", ["tackle"], 1, { item: "focus-sash" });
    const state = engine.createBattle([charizard], [venusaur]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower" },
      { type: "move", pokemonId: venusaur.id, moveId: "tackle" }
    );

    expect(next.sides.opponent.team[0].currentHp).toBe(1);
    expect(next.sides.opponent.team[0].fainted).toBe(false);
    expect(next.sides.opponent.team[0].item).toBeUndefined();
    expect(next.log.some((e) => e.type === "item-consumed" && e.itemId === "focus-sash")).toBe(true);
  });

  it("Life Orb causes recoil damage to its holder after it deals damage", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const charizard = buildPokemon("charizard", "charizard", ["ember"], 50, { item: "life-orb" });
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard], [blastoise]);
    const hpBefore = charizard.currentHp;

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "ember" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );

    expect(next.sides.player.team[0].currentHp).toBeLessThan(hpBefore);
    expect(next.log.some((e) => e.type === "secondary-damage" && e.cause === "life-orb")).toBe(true);
  });
});

describe("TurnEngine: weather, terrain, and hazards in a real turn", () => {
  it("Sunny Day sets the weather for subsequent turns", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const charizard = buildPokemon("charizard", "charizard", ["sunny-day"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard], [blastoise]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "sunny-day" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );

    expect(next.weather.id).toBe("sun");
    expect(next.weather.turnsRemaining).toBeGreaterThan(0);
  });

  it("Electric Terrain sets the terrain for subsequent turns", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const pikachu = buildPokemon("pikachu", "pikachu", ["electric-terrain"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([pikachu], [blastoise]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: pikachu.id, moveId: "electric-terrain" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );

    expect(next.terrain.id).toBe("electric");
  });

  it("Stealth Rock damages the next Pokémon that switches in", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const gengar = buildPokemon("gengar", "gengar", ["stealth-rock"], 50, { ability: "levitate" });
    const charizard = buildPokemon("charizard", "charizard", ["tackle"]);
    const bench = buildPokemon("bench", "blastoise", ["tackle"]);
    const state = engine.createBattle([gengar], [charizard, bench]);

    const afterSetup = engine.submitTurn(
      state,
      { type: "move", pokemonId: gengar.id, moveId: "stealth-rock" },
      { type: "move", pokemonId: charizard.id, moveId: "tackle" }
    );
    expect(afterSetup.sides.opponent.hazards.stealthRock).toBe(true);

    const benchHpBefore = bench.currentHp;
    const afterSwitch = engine.submitTurn(
      afterSetup,
      { type: "move", pokemonId: gengar.id, moveId: "stealth-rock" },
      { type: "switch", pokemonId: bench.id }
    );

    expect(afterSwitch.sides.opponent.team.find((p) => p.id === bench.id)!.currentHp).toBeLessThan(benchHpBefore);
    expect(afterSwitch.log.some((e) => e.type === "secondary-damage" && e.cause === "stealth-rock")).toBe(true);
  });
});
