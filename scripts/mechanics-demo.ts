/**
 * Phase 4 milestone: prove Mega Evolution, Gigantamax, Z-Moves, and Battle Bond all work
 * through the real engine (BattleEngine/TurnEngine/MechanicsEngine) — not just in isolation.
 * Uses scripted actions (not random AI) so each mechanic's activation is easy to follow.
 *
 * Usage: npm run demo:mechanics
 */
import { BattleEngine } from "@/engine/BattleEngine";
import { getSpecies } from "@/data/pokemon";
import { createPokemon } from "@/utils/createPokemon";
import { SeededRNG } from "@/utils/rng";
import type { BattleEvent, BattleState } from "@/types/battle";

function narrate(event: BattleEvent, state: BattleState) {
  const name = (side: "player" | "opponent", id: string) =>
    getSpecies(state.sides[side].team.find((p) => p.id === id)!.speciesId).name;

  switch (event.type) {
    case "turn-start":
      console.log(`\n=== Turn ${event.turn} ===`);
      break;
    case "form-change": {
      const label = { mega: "Mega Evolved", gigantamax: "Gigantamaxed", "battle-bond": "Battle Bond activated!", revert: "reverted to its base form" }[event.cause];
      console.log(`${name(event.side, event.pokemonId)} ${label}${event.form ? ` -> ${event.form}` : ""}!`);
      break;
    }
    case "z-move-used":
      console.log(`${name(event.side, event.pokemonId)} unleashes a Z-Move version of ${event.moveId}!`);
      break;
    case "move-used":
      console.log(`${name(event.side, event.pokemonId)} used ${event.moveId}!`);
      break;
    case "damage":
      console.log(`  ${name(event.side, event.pokemonId)} took ${event.amount} damage (${event.remainingHp} HP left).`);
      break;
    case "fainted":
      console.log(`  ${name(event.side, event.pokemonId)} fainted!`);
      break;
    case "battle-end":
      console.log(`\n=== Battle Over: ${event.winner ? (event.winner === "player" ? "Team A" : "Team B") + " wins!" : "Draw!"} ===`);
      break;
  }
}

function main() {
  const rng = new SeededRNG(42);
  const engine = new BattleEngine(rng);

  const lucario = createPokemon({
    id: "lucario",
    speciesId: "lucario",
    level: 50,
    nature: "Adamant",
    ability: "steadfast",
    item: "lucarionite",
    moveIds: ["close-combat"],
  });
  const pikachu = createPokemon({
    id: "pikachu",
    speciesId: "pikachu",
    level: 50,
    nature: "Timid",
    ability: "static",
    item: "z-crystal",
    moveIds: ["thunderbolt"],
  });
  const charizard = createPokemon({
    id: "charizard",
    speciesId: "charizard",
    level: 50,
    nature: "Modest",
    ability: "blaze",
    moveIds: ["flamethrower"],
  });
  const greninja = createPokemon({
    id: "greninja",
    speciesId: "greninja",
    level: 50,
    nature: "Timid",
    ability: "battle-bond",
    moveIds: ["hydro-pump"],
  });
  const punchingBag = createPokemon({
    id: "punching-bag",
    speciesId: "venusaur",
    level: 5,
    nature: "Hardy",
    ability: "overgrow",
    moveIds: ["tackle"],
  });

  console.log("=== Battle Mechanics Demo (Phase 4 milestone) ===\n");

  console.log("--- 1. Mega Evolution: Lucario mega-evolves mid-battle ---");
  let state = engine.createBattle([lucario], [{ ...punchingBag, id: "target-1" }]);
  let log = 0;
  const flush = (s: BattleState) => {
    for (let i = log; i < s.log.length; i++) narrate(s.log[i], s);
    log = s.log.length;
  };
  state = engine.submitTurn(
    state,
    { type: "move", pokemonId: lucario.id, moveId: "close-combat", mechanic: "mega" },
    { type: "move", pokemonId: "target-1", moveId: "tackle" }
  );
  flush(state);

  console.log("\n--- 2. Z-Move: Pikachu unleashes a boosted Thunderbolt ---");
  log = 0;
  state = engine.createBattle([pikachu], [{ ...punchingBag, id: "target-2" }]);
  state = engine.submitTurn(
    state,
    { type: "move", pokemonId: pikachu.id, moveId: "thunderbolt", mechanic: "z-move" },
    { type: "move", pokemonId: "target-2", moveId: "tackle" }
  );
  flush(state);

  console.log("\n--- 3. Gigantamax: Charizard grows for 3 turns ---");
  log = 0;
  const sturdyTarget = createPokemon({
    id: "target-3",
    speciesId: "blastoise", // resists Fire, high level, survives all 3 hits easily
    level: 100,
    nature: "Bold",
    ability: "torrent",
    moveIds: ["tackle"],
  });
  state = engine.createBattle([charizard], [sturdyTarget]);
  state = engine.submitTurn(
    state,
    { type: "move", pokemonId: charizard.id, moveId: "flamethrower", mechanic: "gigantamax" },
    { type: "move", pokemonId: "target-3", moveId: "tackle" }
  );
  flush(state);
  for (let i = 0; i < 2 && state.phase !== "ended"; i++) {
    state = engine.submitTurn(
      state,
      { type: "move", pokemonId: charizard.id, moveId: "flamethrower" },
      { type: "move", pokemonId: "target-3", moveId: "tackle" }
    );
    flush(state);
  }

  console.log("\n--- 4. Battle Bond: Greninja transforms automatically after a KO ---");
  log = 0;
  state = engine.createBattle([greninja], [{ ...punchingBag, id: "target-4" }]);
  state = engine.submitTurn(
    state,
    { type: "move", pokemonId: greninja.id, moveId: "hydro-pump" },
    { type: "move", pokemonId: "target-4", moveId: "tackle" }
  );
  flush(state);
}

main();
