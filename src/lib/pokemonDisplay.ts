import { getSpecies } from "@/data/pokemon";
import type { BattleState } from "@/types/battle";
import type { Pokemon } from "@/types/pokemon";
import { getPokemonTypes } from "@/utils/pokemonTypes";

/** Finds a Pokémon by id on either side of a battle. */
export function findPokemonInState(state: BattleState, pokemonId: string): Pokemon | undefined {
  return (
    state.sides.player.team.find((p) => p.id === pokemonId) ??
    state.sides.opponent.team.find((p) => p.id === pokemonId)
  );
}

/** A Pokémon's current display name, honoring an active form (Mega/Gigantamax/Battle Bond) and nickname. */
export function getDisplayName(pokemon: Pokemon): string {
  if (pokemon.nickname) return pokemon.nickname;
  const species = getSpecies(pokemon.speciesId);
  if (pokemon.form) {
    const form = species.forms?.find((f) => f.id === pokemon.form);
    if (form) return form.name;
  }
  return species.name;
}

export const getDisplayTypes = getPokemonTypes;
