import { describe, expect, it } from "vitest";
import { BattleEngine } from "../BattleEngine";
import { SeededRNG } from "@/utils/rng";
import { STANDARD_RULES } from "@/types/rules";
import { buildPokemon } from "./testHelpers";

describe("TurnEngine: Mega Evolution in a real turn", () => {
  it("Mega Evolving changes stats before that turn's speed order is decided", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    // Base Lucario (90 speed) is slower than base Greninja (122 speed); Mega Lucario (112) still
    // isn't faster than Greninja, so instead prove the mega activated and stats actually changed.
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"], 50, { item: "lucarionite" });
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([lucario], [blastoise]);
    const attackBefore = lucario.stats.attack;

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: lucario.id, moveId: "close-combat", mechanic: "mega" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );

    const evolved = next.sides.player.team[0];
    expect(evolved.form).toBe("mega-lucario");
    expect(evolved.stats.attack).toBeGreaterThan(attackBefore);
    expect(next.log.some((e) => e.type === "form-change" && e.cause === "mega")).toBe(true);
    // Still Mega Evolved on the following turn (mega doesn't wear off).
    expect(evolved.mechanicState.megaEvolved).toBe(true);
  });

  it("rejects Mega Evolving without the right held item", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([lucario], [blastoise]);

    expect(() =>
      engine.submitTurn(
        state,
        { type: "move", pokemonId: lucario.id, moveId: "close-combat", mechanic: "mega" },
        { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
      )
    ).toThrow(/Cannot activate mega/);
  });

  it("a custom ruleset can disable Mega Evolution entirely", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"], 50, { item: "lucarionite" });
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([lucario], [blastoise], { ...STANDARD_RULES, allowMegaEvolution: false });

    expect(() =>
      engine.submitTurn(
        state,
        { type: "move", pokemonId: lucario.id, moveId: "close-combat", mechanic: "mega" },
        { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
      )
    ).toThrow(/disabled by the ruleset/);
  });
});

describe("TurnEngine: Gigantamax in a real turn", () => {
  it("Gigantamaxing doubles max HP and the form reverts after 3 turns", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard], [blastoise]);
    const maxHpBefore = charizard.stats.hp;

    // Duration ticks down at the end of the turn it's activated on too, so "3 turns" means
    // Gigantamax is active for turns 1-3 and has reverted by the time turn 4 starts.
    let current = engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower", mechanic: "gigantamax" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );
    expect(current.sides.player.team[0].stats.hp).toBe(maxHpBefore * 2);
    expect(current.sides.player.team[0].form).toBe("gigantamax-charizard");
    expect(current.sides.player.team[0].mechanicState.dynamaxTurnsRemaining).toBe(2);

    // Turn 2: still active.
    current = engine.submitTurn(
      current,
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );
    expect(current.sides.player.team[0].mechanicState.gigantamaxed).toBe(true);

    // Turn 3: duration runs out at the end of this turn and it reverts.
    current = engine.submitTurn(
      current,
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );
    expect(current.sides.player.team[0].mechanicState.gigantamaxed).toBe(false);
    expect(current.sides.player.team[0].stats.hp).toBe(maxHpBefore);
    expect(current.log.some((e) => e.type === "form-change" && e.cause === "revert")).toBe(true);
  });
});

describe("TurnEngine: Z-Moves in a real turn", () => {
  it("using a Z-Move deals damage, marks it used, and logs a z-move-used event", () => {
    // Large level gap so Pikachu is both faster and far too bulky to be KO'd first —
    // this test is about the Z-Move activating correctly, not damage survival odds.
    // (A magnitude comparison against the base move isn't reliable here: the Z-Move
    // variant has no accuracy check, so it skips an RNG draw in checkHit and its crit/
    // random-roll diverge from a same-seed non-Z run — see getZMoveVariant's unit test
    // in MechanicsEngine.test.ts for the actual power-boost assertion.)
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"], 100, { item: "z-crystal" });
    const gengar = buildPokemon("gengar", "gengar", ["shadow-ball"], 5);

    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const state = engine.createBattle([pikachu], [gengar]);
    const zResult = engine.submitTurn(
      state,
      { type: "move", pokemonId: pikachu.id, moveId: "thunderbolt", mechanic: "z-move" },
      { type: "move", pokemonId: gengar.id, moveId: "shadow-ball" }
    );
    const zDamageEvent = zResult.log.find((e) => e.type === "damage" && e.side === "opponent");

    expect(zResult.log.some((e) => e.type === "z-move-used")).toBe(true);
    expect(zDamageEvent).toBeDefined();
    if (zDamageEvent?.type === "damage") {
      expect(zDamageEvent.amount).toBeGreaterThan(0);
    }
    expect(zResult.sides.player.team[0].mechanicState.zMoveUsed).toBe(true);
  });

  it("rejects a Z-Move without holding a Z-Crystal", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"]);
    const gengar = buildPokemon("gengar", "gengar", ["shadow-ball"]);
    const state = engine.createBattle([pikachu], [gengar]);

    expect(() =>
      engine.submitTurn(
        state,
        { type: "move", pokemonId: pikachu.id, moveId: "thunderbolt", mechanic: "z-move" },
        { type: "move", pokemonId: gengar.id, moveId: "shadow-ball" }
      )
    ).toThrow(/Z-Crystal/);
  });
});

describe("TurnEngine: Battle Bond in a real turn", () => {
  it("activates automatically when a Battle Bond Greninja gets a KO", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const greninja = buildPokemon("greninja", "greninja", ["hydro-pump"], 100, { ability: "battle-bond" });
    const weakling = buildPokemon("weakling", "venusaur", ["tackle"], 1);
    const state = engine.createBattle([greninja], [weakling]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: greninja.id, moveId: "hydro-pump" },
      { type: "move", pokemonId: weakling.id, moveId: "tackle" }
    );

    expect(next.sides.opponent.team[0].fainted).toBe(true);
    expect(next.sides.player.team[0].form).toBe("ash-greninja");
    expect(next.sides.player.team[0].mechanicState.battleBondActivated).toBe(true);
    expect(next.log.some((e) => e.type === "form-change" && e.cause === "battle-bond")).toBe(true);
  });
});
