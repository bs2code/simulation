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

/** Looks up a species by id or by display name (case-insensitive). Returns undefined if no match. */
export function findSpecies(query: string): PokemonSpecies | undefined {
  const normalized = query.trim().toLowerCase();
  return (
    SPECIES_BY_ID.get(normalized) ??
    SPECIES_LIST.find((species) => species.name.toLowerCase() === normalized)
  );
}

export { SPECIES_LIST };
