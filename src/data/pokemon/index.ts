import type { PokemonSpecies } from "@/types/pokemon";
import generatedSpeciesData from "./generated/species.generated.json";
import { SPECIES_LIST } from "./speciesList";

/**
 * Bulk-generated base data (accurate types/base-stats/movepools/abilities for ~1000 species,
 * default form only — see scripts/generate-pokedex.ts), in National Dex order, with the
 * hand-curated roster (real Mega/Gigantamax/Battle Bond forms) swapped in *in place* — by id
 * where they match, falling back to display name where they don't (PokeAPI's default Lycanroc
 * slug is "lycanroc-midday", ours is "lycanroc") — so every curated species keeps its correct
 * Pokédex position instead of being appended at the end. Any curated species with no match at
 * all in the generated set (shouldn't happen for real Pokémon, but handled defensively) is
 * appended afterward.
 */
const GENERATED_SPECIES = generatedSpeciesData as PokemonSpecies[];

const curatedById = new Map(SPECIES_LIST.map((species) => [species.id, species]));
const curatedByName = new Map(SPECIES_LIST.map((species) => [species.name, species]));
const usedCuratedIds = new Set<string>();

const ALL_SPECIES: PokemonSpecies[] = GENERATED_SPECIES.map((generated) => {
  const curated = curatedById.get(generated.id) ?? curatedByName.get(generated.name);
  if (curated) {
    usedCuratedIds.add(curated.id);
    return curated;
  }
  return generated;
});

for (const species of SPECIES_LIST) {
  if (!usedCuratedIds.has(species.id)) ALL_SPECIES.push(species);
}

const SPECIES_BY_ID: Map<string, PokemonSpecies> = new Map(ALL_SPECIES.map((s) => [s.id, s]));

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
