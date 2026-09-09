/**
 * Phase 5 milestone: prove BattleAI can drive a full 6v6 battle end to end, with the AI making
 * every move/switch decision itself (no scripted actions, no "first move with PP" placeholder
 * like earlier demos used). Pits difficulty levels against each other to show they actually play
 * differently — Expert should beat Easy far more often than chance.
 *
 * Usage: npm run demo:ai [gamesToSimulate]
 */
import { BattleAI, type AIDifficulty } from "@/ai/BattleAI";
import { BattleEngine } from "@/engine/BattleEngine";
import { getSpecies } from "@/data/pokemon";
import { createPokemon } from "@/utils/createPokemon";
import { SeededRNG } from "@/utils/rng";
import type { BattleSideId, BattleState } from "@/types/battle";
import type { Pokemon } from "@/types/pokemon";

function buildTeam(idPrefix: string) {
  const roster: [string, string[]][] = [
    ["charizard", ["flamethrower", "aerial-ace", "swords-dance"]],
    ["blastoise", ["hydro-pump", "tackle"]],
    ["venusaur", ["vine-whip", "growl", "swords-dance"]],
    ["pikachu", ["thunderbolt", "quick-attack", "thunder-wave"]],
    ["gengar", ["shadow-ball", "will-o-wisp", "confuse-ray"]],
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

function playOneBattle(seed: number, difficultyA: AIDifficulty, difficultyB: AIDifficulty) {
  const rng = new SeededRNG(seed);
  const engine = new BattleEngine(rng);
  const aiA = new BattleAI(difficultyA, rng);
  const aiB = new BattleAI(difficultyB, rng);

  let state: BattleState = engine.createBattle(buildTeam("A"), buildTeam("B"));
  let iterations = 0;

  while (state.phase !== "ended" && iterations < 300) {
    iterations++;

    if (state.phase === "switching") {
      for (const side of engine.getSidesNeedingSwitch(state)) {
        const ai = side === "player" ? aiA : aiB;
        const action = ai.chooseAction(state, side as BattleSideId);
        // A forced switch only ever needs the pokemonId; chooseAction may return a move if it
        // somehow had no switch options (shouldn't happen when a switch is actually required).
        const replacement =
          action.type === "switch"
            ? action.pokemonId
            : state.sides[side].team.find((p: Pokemon) => !p.fainted)!.id;
        state = engine.resolveForcedSwitch(state, side, replacement);
      }
      continue;
    }

    const playerAction = aiA.chooseAction(state, "player");
    const opponentAction = aiB.chooseAction(state, "opponent");
    state = engine.submitTurn(state, playerAction, opponentAction);
  }

  return state;
}

function main() {
  const gamesToSimulate = Number(process.argv[2] ?? 20);
  const difficultyA: AIDifficulty = "expert";
  const difficultyB: AIDifficulty = "easy";

  console.log(`=== AI Battle Demo (Phase 5 milestone) ===`);
  console.log(`Team A: ${difficultyA} AI   vs   Team B: ${difficultyB} AI`);
  console.log(`Simulating ${gamesToSimulate} full 6v6 battles...\n`);

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let totalTurns = 0;

  for (let i = 0; i < gamesToSimulate; i++) {
    const final = playOneBattle(1000 + i, difficultyA, difficultyB);
    totalTurns += final.turn;
    if (final.winner === "player") winsA++;
    else if (final.winner === "opponent") winsB++;
    else draws++;
  }

  console.log(`Team A (${difficultyA}) wins: ${winsA}/${gamesToSimulate} (${Math.round((winsA / gamesToSimulate) * 100)}%)`);
  console.log(`Team B (${difficultyB}) wins: ${winsB}/${gamesToSimulate} (${Math.round((winsB / gamesToSimulate) * 100)}%)`);
  console.log(`Draws/incomplete: ${draws}`);
  console.log(`Average turns per battle: ${(totalTurns / gamesToSimulate).toFixed(1)}`);

  console.log("\n--- One full battle log (Expert vs Easy) ---");
  const sample = playOneBattle(42, "expert", "easy");
  const moveEvents = sample.log.filter((e) => e.type === "move-used" || e.type === "switch-in" || e.type === "fainted");
  for (const event of moveEvents.slice(0, 20)) {
    console.log(JSON.stringify(event));
  }
  console.log(`... (${sample.log.length} total events, battle ended in ${sample.turn} turns, winner: ${sample.winner ?? "draw"})`);
}

main();
