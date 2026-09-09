import { getSpecies } from "@/data/pokemon";
import { createPokemon } from "@/utils/createPokemon";
import type { Pokemon } from "@/types/pokemon";

/** Not a test file itself — shared fixtures for the engine test suites. */
export function buildPokemon(
  id: string,
  speciesId: string,
  moveIds: string[],
  level = 50,
  options: { ability?: string; item?: string } = {}
): Pokemon {
  const species = getSpecies(speciesId);
  return createPokemon({
    id,
    speciesId,
    level,
    nature: "Hardy",
    ability: options.ability ?? species.abilities[0],
    item: options.item,
    moveIds,
  });
}

/** A full 6-member team built from the Phase 1 starter roster, all fully healthy. */
export function buildFullTeam(idPrefix: string): Pokemon[] {
  return [
    buildPokemon(`${idPrefix}-charizard`, "charizard", ["flamethrower", "aerial-ace"]),
    buildPokemon(`${idPrefix}-blastoise`, "blastoise", ["hydro-pump", "tackle"]),
    buildPokemon(`${idPrefix}-venusaur`, "venusaur", ["vine-whip", "growl"]),
    buildPokemon(`${idPrefix}-pikachu`, "pikachu", ["thunderbolt", "quick-attack"]),
    buildPokemon(`${idPrefix}-gengar`, "gengar", ["shadow-ball", "will-o-wisp"]),
    buildPokemon(`${idPrefix}-greninja`, "greninja", ["hydro-pump", "ice-beam"]),
  ];
}
