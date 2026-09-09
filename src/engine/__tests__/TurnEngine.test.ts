import { describe, expect, it } from "vitest";
import { BattleEngine } from "../BattleEngine";
import { DamageEngine } from "../DamageEngine";
import { SeededRNG } from "@/utils/rng";
import type { MoveAction, SwitchAction } from "@/types/battle";
import { buildPokemon } from "./testHelpers";

function makeEngine(seed = 1) {
  const rng = new SeededRNG(seed);
  return { engine: new BattleEngine(rng), rng };
}

describe("TurnEngine.resolveTurn", () => {
  it("applies damage from both sides and advances the turn counter", () => {
    const { engine } = makeEngine();
    // Both moves have 100 accuracy so this test isn't sensitive to the RNG's accuracy rolls.
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    const state = engine.createBattle([charizard], [blastoise]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower" },
      { type: "move", pokemonId: blastoise.id, moveId: "water-gun" }
    );

    expect(next.turn).toBe(2);
    expect(next.phase).toBe("choosing");
    const playerHp = next.sides.player.team[0].currentHp;
    const opponentHp = next.sides.opponent.team[0].currentHp;
    expect(playerHp).toBeLessThan(charizard.stats.hp);
    expect(opponentHp).toBeLessThan(blastoise.stats.hp);
  });

  it("does not mutate the input state (returns a new object graph)", () => {
    const { engine } = makeEngine();
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    const state = engine.createBattle([charizard], [blastoise]);
    const originalHp = state.sides.opponent.team[0].currentHp;
    const originalTurn = state.turn;

    engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower" },
      { type: "move", pokemonId: blastoise.id, moveId: "water-gun" }
    );

    expect(state.sides.opponent.team[0].currentHp).toBe(originalHp);
    expect(state.turn).toBe(originalTurn);
  });

  it("orders moves by priority regardless of speed", () => {
    const { engine } = makeEngine();
    // Blastoise (78 speed) using Quick Attack (priority 1) should go before
    // Greninja (122 speed) using a priority-0 move. (Quick Attack isn't in Blastoise's
    // real learnset — it's assigned directly here purely to test priority ordering.)
    const blastoise = buildPokemon("blastoise", "blastoise", ["quick-attack"]);
    const greninja = buildPokemon("greninja", "greninja", ["water-gun"]);
    expect(greninja.stats.speed).toBeGreaterThan(blastoise.stats.speed);

    const state = engine.createBattle([blastoise], [greninja]);
    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: blastoise.id, moveId: "quick-attack" },
      { type: "move", pokemonId: greninja.id, moveId: "water-gun" }
    );

    const moveEvents = next.log.filter((e) => e.type === "move-used");
    expect(moveEvents[0]).toMatchObject({ pokemonId: blastoise.id });
    expect(moveEvents[1]).toMatchObject({ pokemonId: greninja.id });
  });

  it("orders same-priority moves by speed", () => {
    const { engine } = makeEngine();
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    const greninja = buildPokemon("greninja", "greninja", ["water-gun"]);

    const state = engine.createBattle([blastoise], [greninja]);
    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: blastoise.id, moveId: "water-gun" },
      { type: "move", pokemonId: greninja.id, moveId: "water-gun" }
    );

    const moveEvents = next.log.filter((e) => e.type === "move-used");
    expect(moveEvents[0]).toMatchObject({ pokemonId: greninja.id });
  });

  it("applies stat-change move effects to the correct target", () => {
    const { engine } = makeEngine();
    // Big level gap so Venusaur is both faster and far too bulky to be KO'd before it
    // gets to act — this test is about the stat-change effect, not survival odds.
    const venusaur = buildPokemon("venusaur", "venusaur", ["growl"], 100);
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"], 5);
    const state = engine.createBattle([venusaur], [charizard]);

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: venusaur.id, moveId: "growl" },
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower" }
    );

    expect(next.sides.opponent.team[0].statStages.attack).toBe(-1);
    const statEvent = next.log.find((e) => e.type === "stat-change");
    expect(statEvent).toMatchObject({ pokemonId: charizard.id, stat: "attack", newStage: -1 });
  });

  it("decrements PP when a move is used", () => {
    const { engine } = makeEngine();
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard], [blastoise]);
    const startingPP = state.sides.player.team[0].moves[0].currentPP;

    const next = engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "ember" },
      { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
    );

    expect(next.sides.player.team[0].moves[0].currentPP).toBe(startingPP - 1);
  });

  it("rejects a move action for a Pokémon that isn't active", () => {
    const { engine } = makeEngine();
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const bench = buildPokemon("bench", "pikachu", ["tackle"]);
    const state = engine.createBattle([charizard, bench], [blastoise]);

    expect(() =>
      engine.submitTurn(
        state,
        { type: "move", pokemonId: bench.id, moveId: "tackle" },
        { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
      )
    ).toThrow(/active Pokémon/);
  });

  it("rejects a move the Pokémon doesn't know", () => {
    const { engine } = makeEngine();
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard], [blastoise]);

    expect(() =>
      engine.submitTurn(
        state,
        { type: "move", pokemonId: charizard.id, moveId: "hydro-pump" },
        { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
      )
    ).toThrow(/does not know move/);
  });

  it("rejects resolving a turn when the phase isn't 'choosing'", () => {
    const { engine } = makeEngine();
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard], [blastoise]);
    state.phase = "ended";

    expect(() =>
      engine.submitTurn(
        state,
        { type: "move", pokemonId: charizard.id, moveId: "ember" },
        { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
      )
    ).toThrow(/phase/);
  });
});

describe("TurnEngine switching", () => {
  it("a switch action swaps the active Pokémon and consumes the side's turn", () => {
    const { engine } = makeEngine();
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const bench = buildPokemon("bench", "pikachu", ["thunderbolt"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard, bench], [blastoise]);

    const switchAction: SwitchAction = { type: "switch", pokemonId: bench.id };
    const moveAction: MoveAction = { type: "move", pokemonId: blastoise.id, moveId: "tackle" };
    const next = engine.submitTurn(state, switchAction, moveAction);

    expect(next.sides.player.activePokemonIndex).toBe(1);
    expect(next.sides.player.team[1].id).toBe(bench.id);
    expect(next.log.some((e) => e.type === "switch-in" && e.pokemonId === bench.id)).toBe(true);
    expect(next.log.some((e) => e.type === "move-used" && e.pokemonId === charizard.id)).toBe(false);
  });

  it("rejects switching into the currently active Pokémon", () => {
    const { engine } = makeEngine();
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const bench = buildPokemon("bench", "pikachu", ["thunderbolt"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard, bench], [blastoise]);

    expect(() =>
      engine.submitTurn(
        state,
        { type: "switch", pokemonId: charizard.id },
        { type: "move", pokemonId: blastoise.id, moveId: "tackle" }
      )
    ).toThrow(/Invalid switch target/);
  });

  it("triggers a forced switch when the active Pokémon faints and a replacement exists", () => {
    const rng = new SeededRNG(1);
    const damageEngine = new DamageEngine(rng);
    const engine = new BattleEngine(rng, damageEngine);

    const attacker = buildPokemon("attacker", "charizard", ["flamethrower"], 100);
    const victim = buildPokemon("victim", "venusaur", ["tackle"], 5);
    const benchMon = buildPokemon("bench", "pikachu", ["thunderbolt"], 50);
    const state = engine.createBattle([attacker], [victim, benchMon]);

    const afterFaint = engine.submitTurn(
      state,
      { type: "move", pokemonId: attacker.id, moveId: "flamethrower" },
      { type: "move", pokemonId: victim.id, moveId: "tackle" }
    );

    expect(afterFaint.sides.opponent.team[0].fainted).toBe(true);
    expect(afterFaint.phase).toBe("switching");
    expect(engine.getSidesNeedingSwitch(afterFaint)).toContain("opponent");

    const afterSwitch = engine.resolveForcedSwitch(afterFaint, "opponent", benchMon.id);
    expect(afterSwitch.phase).toBe("choosing");
    expect(afterSwitch.sides.opponent.activePokemonIndex).toBe(1);
    expect(afterSwitch.turn).toBe(afterFaint.turn + 1);
  });

  it("ends the battle when a side's last Pokémon faints", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const attacker = buildPokemon("attacker", "charizard", ["flamethrower"], 100);
    const victim = buildPokemon("victim", "venusaur", ["tackle"], 5);
    const state = engine.createBattle([attacker], [victim]);

    const result = engine.submitTurn(
      state,
      { type: "move", pokemonId: attacker.id, moveId: "flamethrower" },
      { type: "move", pokemonId: victim.id, moveId: "tackle" }
    );

    expect(result.phase).toBe("ended");
    expect(result.winner).toBe("player");
    expect(engine.isBattleOver(result)).toBe(true);
    expect(result.log.some((e) => e.type === "battle-end" && e.winner === "player")).toBe(true);
  });
});
