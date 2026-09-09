import { describe, expect, it } from "vitest";
import { computeBattleStats } from "../computeBattleStats";
import { BattleEngine } from "@/engine/BattleEngine";
import { SeededRNG } from "@/utils/rng";
import { buildPokemon } from "@/engine/__tests__/testHelpers";

describe("computeBattleStats", () => {
  it("attributes damage and KOs to the attacker, and totals damage dealt per side", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"], 100);
    const weakling = buildPokemon("weakling", "venusaur", ["tackle"], 1);
    const state = engine.createBattle([charizard], [weakling]);

    const final = engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower" },
      { type: "move", pokemonId: weakling.id, moveId: "tackle" }
    );

    const stats = computeBattleStats(final);
    expect(stats.damageDealtByPokemon[charizard.id]).toBeGreaterThan(0);
    expect(stats.koCountByPokemon[charizard.id]).toBe(1);
    expect(stats.totalDamageDealtBySide.player).toBeGreaterThan(0);
    expect(stats.totalDamageDealtBySide.opponent).toBe(0);
    expect(stats.mvpPokemonId).toBe(charizard.id);
  });

  it("MVP is tie-broken by damage dealt when KO counts are equal", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const attacker1 = buildPokemon("a1", "charizard", ["flamethrower"], 100);
    const attacker2 = buildPokemon("a2", "greninja", ["hydro-pump"], 100);
    const victim1 = buildPokemon("v1", "venusaur", ["tackle"], 1);
    const victim2 = buildPokemon("v2", "pikachu", ["tackle"], 1);
    const state = engine.createBattle([attacker1, attacker2], [victim1, victim2]);

    let current = engine.submitTurn(
      state,
      { type: "move", pokemonId: attacker1.id, moveId: "flamethrower" },
      { type: "move", pokemonId: victim1.id, moveId: "tackle" }
    );
    if (current.phase === "switching") {
      current = engine.resolveForcedSwitch(current, "opponent", victim2.id);
    }
    current = engine.submitTurn(
      current,
      { type: "move", pokemonId: attacker1.id, moveId: "flamethrower" },
      { type: "move", pokemonId: victim2.id, moveId: "tackle" }
    );

    const stats = computeBattleStats(current);
    // attacker1 got both KOs; attacker2 never acted (still on the bench).
    expect(stats.koCountByPokemon[attacker1.id]).toBe(2);
    expect(stats.mvpPokemonId).toBe(attacker1.id);
  });

  it("returns an undefined MVP when nothing happened (e.g. only status moves used)", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const venusaur = buildPokemon("venusaur", "venusaur", ["swords-dance"]);
    const charizard = buildPokemon("charizard", "charizard", ["swords-dance"]);
    const state = engine.createBattle([venusaur], [charizard]);

    const final = engine.submitTurn(
      state,
      { type: "move", pokemonId: venusaur.id, moveId: "swords-dance" },
      { type: "move", pokemonId: charizard.id, moveId: "swords-dance" }
    );

    const stats = computeBattleStats(final);
    expect(stats.mvpPokemonId).toBeUndefined();
  });
});
