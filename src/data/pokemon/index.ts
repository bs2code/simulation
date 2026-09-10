import type { PokemonSpecies } from "@/types/pokemon";
import generatedSpeciesData from "./generated/species.generated.json";
import { SPECIES_LIST } from "./speciesList";

/**
 * Bulk-generated base data (accurate types/base-stats/movepools/abilities for ~1000 species,
 * default form only — see scripts/generate-pokedex.ts) merged with the hand-curated roster
 * (which has real Mega/Gigantamax/Battle Bond forms). Curated entries always win on id
 * collision, so re-running the generator never clobbers hand-built data.
 */
const GENERATED_SPECIES = generatedSpeciesData as PokemonSpecies[];

// PokeAPI's "default form" slug doesn't always match ours (e.g. its default Lycanroc is
// "lycanroc-midday", ours is "lycanroc") — dedupe by display name too, or the same Pokémon
// shows up twice under different ids.
const CURATED_NAMES = new Set(SPECIES_LIST.map((species) => species.name));
const DEDUPED_GENERATED_SPECIES = GENERATED_SPECIES.filter((species) => !CURATED_NAMES.has(species.name));

const SPECIES_BY_ID: Map<string, PokemonSpecies> = new Map([
  ...DEDUPED_GENERATED_SPECIES.map((species): [string, PokemonSpecies] => [species.id, species]),
  ...SPECIES_LIST.map((species): [string, PokemonSpecies] => [species.id, species]),
]);

const ALL_SPECIES: PokemonSpecies[] = Array.from(SPECIES_BY_ID.values());

export function getSpecies(speciesId: string): PokemonSpecies {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) {
    throw new Error(`Unknown species id: ${speciesId}`);
  }
  return species;
}

export function getAllSpecies(): PokemonSpecies[] {
  return ALL_SPECIES;
}

/** Looks up a species by id or by display name (case-insensitive). Returns undefined if no match. */
export function findSpecies(query: string): PokemonSpecies | undefined {
  const normalized = query.trim().toLowerCase();
  return (
    SPECIES_BY_ID.get(normalized) ??
    ALL_SPECIES.find((species) => species.name.toLowerCase() === normalized)
  );
}

/** The hand-curated roster only (has real Mega/Gigantamax/Battle Bond forms). */
export { SPECIES_LIST };
