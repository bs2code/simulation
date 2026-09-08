/**
 * Phase 1 milestone: prove the engine can resolve a battle turn-by-turn with no UI involved.
 * This is a deliberately minimal orchestration — not the real TurnEngine (that's Phase 2) —
 * just enough sequencing (speed order -> attack -> attack -> faint check) to exercise
 * DamageEngine, the type chart, and stat calculation together end to end.
 *
 * Usage:
 *   npm run demo:battle                       -> prompts you for two Pokémon names
 *   npm run demo:battle -- charizard blastoise -> battles them directly
 *
 * Move selection is a placeholder (random among damaging moves) since the real BattleAI
 * is Phase 5 — this script exists to exercise the engine, not to be the final experience.
 */
import { createInterface } from "node:readline/promises";
import { DamageEngine } from "@/engine/DamageEngine";
import { getMove } from "@/data/moves";
import { findSpecies, getAllSpecies, getSpecies } from "@/data/pokemon";
import { createPokemon } from "@/utils/createPokemon";
import { SeededRNG, type RNG } from "@/utils/rng";
import type { Pokemon } from "@/types/pokemon";

const MAX_MOVES = 4;
const LEVEL = 50;
const MAX_TURNS = 50;

function describe(pokemon: Pokemon): string {
  const species = getSpecies(pokemon.speciesId);
  return `${species.name} (Lv.${pokemon.level}, Types: ${species.types.join("/")}, ${pokemon.currentHp}/${pokemon.stats.hp} HP)`;
}

function buildPokemon(id: string, speciesId: string): Pokemon {
  const species = getSpecies(speciesId);
  return createPokemon({
    id,
    speciesId,
    level: LEVEL,
    nature: "Hardy",
    ability: species.abilities[0],
    moveIds: species.moves.slice(0, MAX_MOVES),
  });
}

function chooseMove(pokemon: Pokemon, rng: RNG): string {
  const damagingMoves = pokemon.moves.filter((m) => (getMove(m.moveId).power ?? 0) > 0);
  const pool = damagingMoves.length > 0 ? damagingMoves : pokemon.moves;
  const choice = pool[rng.integer(0, pool.length - 1)];
  return choice.moveId;
}

function runOneTurn(engine: DamageEngine, rng: RNG, a: Pokemon, b: Pokemon) {
  const aMoveId = chooseMove(a, rng);
  const bMoveId = chooseMove(b, rng);

  const order =
    a.stats.speed >= b.stats.speed
      ? [
          { attacker: a, moveId: aMoveId, defender: b },
          { attacker: b, moveId: bMoveId, defender: a },
        ]
      : [
          { attacker: b, moveId: bMoveId, defender: a },
          { attacker: a, moveId: aMoveId, defender: b },
        ];

  for (const { attacker, moveId, defender } of order) {
    if (attacker.fainted || defender.fainted) continue;

    const move = getMove(moveId);
    const attackerName = getSpecies(attacker.speciesId).name;
    const defenderName = getSpecies(defender.speciesId).name;
    console.log(`\n${attackerName} used ${move.name}!`);

    if (!engine.checkHit(attacker, defender, move)) {
      console.log(`${attackerName}'s attack missed!`);
      continue;
    }

    const result = engine.calculateDamage(attacker, defender, move);
    if (result.immune) {
      console.log(`It doesn't affect ${defenderName}...`);
      continue;
    }
    if (move.category === "status") {
      console.log(`${defenderName} was affected!`);
      continue;
    }
    if (result.superEffective) console.log("It's super effective!");
    if (result.resisted) console.log("It's not very effective...");
    if (result.critical) console.log("A critical hit!");

    defender.currentHp = Math.max(0, defender.currentHp - result.damage);
    const pctLost = Math.round((result.damage / defender.stats.hp) * 100);
    console.log(
      `${defenderName} lost ${pctLost}% HP! (${result.damage} damage, ${defender.currentHp}/${defender.stats.hp} left)`
    );

    if (defender.currentHp === 0) {
      defender.fainted = true;
      console.log(`${defenderName} fainted!`);
    }
  }
}

type Prompter = (question: string) => Promise<string>;

async function resolveSpeciesArg(
  label: string,
  provided: string | undefined,
  ask: Prompter
): Promise<string> {
  if (provided) {
    const species = findSpecies(provided);
    if (!species) {
      console.error(`Unknown Pokémon "${provided}". Available: ${getAllSpecies().map((s) => s.name).join(", ")}`);
      process.exit(1);
    }
    return species.id;
  }

  while (true) {
    const answer = await ask(`${label} (available: ${getAllSpecies().map((s) => s.name).join(", ")}): `);
    const species = findSpecies(answer);
    if (species) return species.id;
    console.log(`Unknown Pokémon "${answer}", try again.`);
  }
}

async function main() {
  const [argA, argB] = process.argv.slice(2);
  const needsPrompt = !argA || !argB;
  const rl = needsPrompt ? createInterface({ input: process.stdin, output: process.stdout }) : undefined;
  // Pulling from the interface's own async iterator (rather than stacking rl.question() calls)
  // reliably reads one line at a time even when both answers arrive in a single buffered chunk,
  // which is what happens with piped/non-TTY stdin.
  const lineIterator = rl?.[Symbol.asyncIterator]();
  const ask: Prompter = async (question) => {
    if (!lineIterator) return "";
    process.stdout.write(question);
    const { value, done } = await lineIterator.next();
    return done ? "" : value;
  };

  const speciesAId = await resolveSpeciesArg("Player 1's Pokémon", argA, ask);
  const speciesBId = await resolveSpeciesArg("Player 2's Pokémon", argB, ask);
  rl?.close();

  const rng = new SeededRNG(Date.now());
  const engine = new DamageEngine(rng);

  const pokemonA = buildPokemon("player-1", speciesAId);
  const pokemonB = buildPokemon("player-2", speciesBId);

  console.log("\n=== Battle Start ===");
  console.log(describe(pokemonA));
  console.log(describe(pokemonB));

  let turn = 1;
  while (!pokemonA.fainted && !pokemonB.fainted && turn <= MAX_TURNS) {
    console.log(`\n--- Turn ${turn} ---`);
    runOneTurn(engine, rng, pokemonA, pokemonB);
    turn++;
  }

  console.log("\n=== Battle Over ===");
  if (pokemonA.fainted && pokemonB.fainted) {
    console.log("Double knockout!");
  } else if (pokemonA.fainted) {
    console.log(`${getSpecies(pokemonB.speciesId).name} wins!`);
  } else if (pokemonB.fainted) {
    console.log(`${getSpecies(pokemonA.speciesId).name} wins!`);
  } else {
    console.log("Time limit reached — no winner.");
  }
}

main();
