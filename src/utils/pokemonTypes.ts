import { getSpecies } from "@/data/pokemon";
import type { Pokemon, PokemonType } from "@/types/pokemon";

/** A Pokémon's current types, accounting for an active alternate form if it has one. */
export function getPokemonTypes(pokemon: Pokemon): PokemonType[] {
  const species = getSpecies(pokemon.speciesId);
  if (pokemon.form) {
    const form = species.forms?.find((f) => f.id === pokemon.form);
    if (form) return form.types;
  }
  return species.types;
}
