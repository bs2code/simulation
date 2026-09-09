/**
 * Phase 2 milestone: prove BattleEngine/TurnEngine/SwitchEngine can carry a full 6v6 battle
 * to completion — fainting, forced switches, and all — using the real engine (not the ad hoc
 * loop from the Phase 1 demo). Move selection is still a placeholder (first move with PP);
 * the real BattleAI is Phase 5.
 *
 * Usage: npm run demo:battle6
 */
import { BattleEngine } from "@/engine/BattleEngine";
import { getSpecies } from "@/data/pokemon";
import { createPokemon } from "@/utils/createPokemon";
import { SeededRNG } from "@/utils/rng";
import type { BattleEvent, BattleSideId, BattleState } from "@/types/battle";
import type { Pokemon } from "@/types/pokemon";

function buildTeam(idPrefix: string): Pokemon[] {
  const roster: [string, string[]][] = [
    ["charizard", ["flamethrower", "aerial-ace"]],
    ["blastoise", ["hydro-pump", "tackle"]],
    ["venusaur", ["vine-whip", "growl"]],
    ["pikachu", ["thunderbolt", "quick-attack"]],
    ["gengar", ["shadow-ball", "will-o-wisp"]],
    ["greninja", ["hydro-pump", "ice-beam"]],
  ];
  return roster.map(([speciesId, moveIds]) =>
    createPokemon({
      id: `${idPrefix}-${speciesId}`,
      speciesId,
      level: 50,
      nature: "Hardy",
      ability: getSpecies(speciesId).abilities[0],
      moveIds,
    })
  );
}

function pokemonName(pokemon: Pokemon): string {
  return `${getSpecies(pokemon.speciesId).name}`;
}

function narrate(event: BattleEvent, state: BattleState) {
  const findPokemon = (side: BattleSideId, id: string) =>
    state.sides[side].team.find((p) => p.id === id);

  switch (event.type) {
    case "turn-start":
      console.log(`\n=== Turn ${event.turn} ===`);
      break;
    case "move-used": {
      const pokemon = findPokemon(event.side, event.pokemonId);
      console.log(`${event.side === "player" ? "Team A" : "Team B"}'s ${pokemonName(pokemon!)} used ${event.moveId}!`);
      break;
    }
    case "move-missed":
      console.log("  ...but it missed!");
      break;
    case "damage": {
      const pokemon = findPokemon(event.side, event.pokemonId);
      const pct = Math.round((event.amount / pokemon!.stats.hp) * 100);
      const tag = event.result.superEffective ? " (super effective!)" : event.result.resisted ? " (not very effective)" : "";
      const crit = event.result.critical ? " Critical hit!" : "";
      console.log(`  ${pokemonName(pokemon!)} took ${event.amount} damage (${pct}%).${tag}${crit}`);
      break;
    }
    case "fainted": {
      const pokemon = findPokemon(event.side, event.pokemonId);
      console.log(`  ${pokemonName(pokemon!)} fainted!`);
      break;
    }
    case "switch-in": {
      const pokemon = findPokemon(event.side, event.pokemonId);
      console.log(`${event.side === "player" ? "Team A" : "Team B"} sends out ${pokemonName(pokemon!)}!`);
      break;
    }
    case "stat-change": {
      const pokemon = findPokemon(event.side, event.pokemonId);
      const direction = event.stages > 0 ? "rose" : "fell";
      console.log(`  ${pokemonName(pokemon!)}'s ${event.stat} ${direction}!`);
      break;
    }
    case "battle-end":
      console.log(`\n=== Battle Over: ${event.winner ? (event.winner === "player" ? "Team A" : "Team B") + " wins!" : "Draw!"} ===`);
      break;
  }
}

function main() {
  const rng = new SeededRNG(Date.now());
  const engine = new BattleEngine(rng);
  const teamA = buildTeam("A");
  const teamB = buildTeam("B");

  console.log("=== Full 6v6 Battle Demo (Phase 2 milestone) ===");
  console.log("Team A:", teamA.map(pokemonName).join(", "));
  console.log("Team B:", teamB.map(pokemonName).join(", "));

  let state = engine.createBattle(teamA, teamB);
  let iterations = 0;
  const lastLoggedIndex = { count: 0 };

  const flushNewEvents = (s: BattleState) => {
    for (let i = lastLoggedIndex.count; i < s.log.length; i++) narrate(s.log[i], s);
    lastLoggedIndex.count = s.log.length;
  };

  while (state.phase !== "ended" && iterations < 200) {
    iterations++;

    if (state.phase === "switching") {
      for (const side of engine.getSidesNeedingSwitch(state)) {
        const replacement = state.sides[side].team.find((p) => !p.fainted);
        if (!replacement) continue;
        state = engine.resolveForcedSwitch(state, side, replacement.id);
        flushNewEvents(state);
      }
      continue;
    }

    const playerActive = state.sides.player.team[state.sides.player.activePokemonIndex];
    const opponentActive = state.sides.opponent.team[state.sides.opponent.activePokemonIndex];
    const playerMove = playerActive.moves.find((m) => m.currentPP > 0) ?? playerActive.moves[0];
    const opponentMove = opponentActive.moves.find((m) => m.currentPP > 0) ?? opponentActive.moves[0];

    state = engine.submitTurn(
      state,
      { type: "move", pokemonId: playerActive.id, moveId: playerMove.moveId },
      { type: "move", pokemonId: opponentActive.id, moveId: opponentMove.moveId }
    );
    flushNewEvents(state);
  }

  console.log("\n--- Summary ---");
  console.log(`Turns: ${state.turn}`);
  console.log(
    `Team A remaining: ${state.sides.player.team.filter((p) => !p.fainted).length}/6`
  );
  console.log(
    `Team B remaining: ${state.sides.opponent.team.filter((p) => !p.fainted).length}/6`
  );
}

main();
