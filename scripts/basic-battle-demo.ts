/**
 * Phase 1 milestone: prove the engine can resolve a battle turn-by-turn with no UI involved.
 * This is a deliberately minimal orchestration — not the real TurnEngine (that's Phase 2) —
 * just enough sequencing (speed order -> attack -> attack -> faint check) to exercise
 * DamageEngine, the type chart, and stat calculation together end to end.
 *
 * Run with: npm run demo:battle
 */
import { DamageEngine } from "@/engine/DamageEngine";
import { getMove } from "@/data/moves";
import { getSpecies } from "@/data/pokemon";
import { createPokemon } from "@/utils/createPokemon";
import { SeededRNG } from "@/utils/rng";
import type { Pokemon } from "@/types/pokemon";

function describe(pokemon: Pokemon): string {
  const species = getSpecies(pokemon.speciesId);
  return `${species.name} (Lv.${pokemon.level}, ${pokemon.currentHp}/${pokemon.stats.hp} HP)`;
}

function runOneTurn(engine: DamageEngine, a: Pokemon, aMoveId: string, b: Pokemon, bMoveId: string) {
  const [first, firstMoveId, second, secondMoveId] =
    a.stats.speed >= b.stats.speed ? [a, aMoveId, b, bMoveId] : [b, bMoveId, a, aMoveId];

  for (const [attacker, moveId, defender] of [
    [first, firstMoveId, first === a ? b : a],
    [second, secondMoveId, second === a ? b : a],
  ] as const) {
    if (attacker.fainted || defender.fainted) continue;

    const move = getMove(moveId);
    const attackerSpecies = getSpecies(attacker.speciesId);
    console.log(`\n${attackerSpecies.name} used ${move.name}!`);

    if (!engine.checkHit(attacker, defender, move)) {
      console.log(`${attackerSpecies.name}'s attack missed!`);
      continue;
    }

    const result = engine.calculateDamage(attacker, defender, move);
    if (result.immune) {
      console.log(`It doesn't affect ${getSpecies(defender.speciesId).name}...`);
      continue;
    }
    if (result.superEffective) console.log("It's super effective!");
    if (result.resisted) console.log("It's not very effective...");
    if (result.critical) console.log("A critical hit!");

    defender.currentHp = Math.max(0, defender.currentHp - result.damage);
    const pctLost = Math.round((result.damage / defender.stats.hp) * 100);
    console.log(
      `${getSpecies(defender.speciesId).name} lost ${pctLost}% HP! (${result.damage} damage, ${defender.currentHp}/${defender.stats.hp} left)`
    );

    if (defender.currentHp === 0) {
      defender.fainted = true;
      console.log(`${getSpecies(defender.speciesId).name} fainted!`);
    }
  }
}

function main() {
  const rng = new SeededRNG(20260909);
  const engine = new DamageEngine(rng);

  const charizard = createPokemon({
    id: "player-charizard",
    speciesId: "charizard",
    level: 50,
    nature: "Modest",
    ability: "Blaze",
    moveIds: ["flamethrower", "ember"],
  });

  const blastoise = createPokemon({
    id: "opponent-blastoise",
    speciesId: "blastoise",
    level: 50,
    nature: "Bold",
    ability: "Torrent",
    moveIds: ["hydro-pump", "water-gun"],
  });

  console.log("=== Basic 1v1 Battle Demo (Phase 1 milestone) ===");
  console.log(describe(charizard));
  console.log(describe(blastoise));

  let turn = 1;
  while (!charizard.fainted && !blastoise.fainted && turn <= 20) {
    console.log(`\n--- Turn ${turn} ---`);
    runOneTurn(engine, charizard, "flamethrower", blastoise, "hydro-pump");
    turn++;
  }

  console.log("\n=== Battle Over ===");
  if (charizard.fainted && blastoise.fainted) {
    console.log("Double knockout!");
  } else if (charizard.fainted) {
    console.log(`${getSpecies(blastoise.speciesId).name} wins!`);
  } else {
    console.log(`${getSpecies(charizard.speciesId).name} wins!`);
  }
}

main();
