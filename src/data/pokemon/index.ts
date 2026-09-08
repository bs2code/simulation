import type { PokemonSpecies } from "@/types/pokemon";
import { SPECIES_LIST } from "./speciesList";

const SPECIES_BY_ID: Map<string, PokemonSpecies> = new Map(
  SPECIES_LIST.map((species) => [species.id, species])
);

export function getSpecies(speciesId: string): PokemonSpecies {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) {
    throw new Error(`Unknown species id: ${speciesId}`);
  }
  return species;
}

export function getAllSpecies(): PokemonSpecies[] {
  return SPECIES_LIST;
}

export { SPECIES_LIST };
