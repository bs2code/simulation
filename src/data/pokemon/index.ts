import type { PokemonForm, PokemonSpecies } from "@/types/pokemon";
import generatedRegionalFormsData from "./generated/regional-forms.generated.json";
import generatedSpeciesData from "./generated/species.generated.json";
import { MEGA_EVOLUTIONS } from "./megaEvolutions";
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
 *
 * Curated types/base-stats/abilities/forms win (they're hand-verified, and Mega/Gigantamax/
 * Battle Bond forms only exist on the curated side) — but curated `moves` were only ever a
 * small Phase 1-5 demo subset (e.g. Charizard's original 7), while the generated side has each
 * species' real, full movepool. Using only the curated list would leave these ~9 species with
 * far fewer selectable moves than the other ~1016 species merged in later, so `moves` is the
 * union of both here rather than the curated list alone.
 */
const GENERATED_SPECIES = generatedSpeciesData as PokemonSpecies[];

const curatedById = new Map(SPECIES_LIST.map((species) => [species.id, species]));
const curatedByName = new Map(SPECIES_LIST.map((species) => [species.name, species]));
const usedCuratedIds = new Set<string>();

const ALL_SPECIES: PokemonSpecies[] = GENERATED_SPECIES.map((generated) => {
  const curated = curatedById.get(generated.id) ?? curatedByName.get(generated.name);
  if (curated) {
    usedCuratedIds.add(curated.id);
    return { ...curated, moves: Array.from(new Set([...generated.moves, ...curated.moves])) };
  }
  return generated;
});

for (const species of SPECIES_LIST) {
  if (!usedCuratedIds.has(species.id)) ALL_SPECIES.push(species);
}

const SPECIES_BY_ID: Map<string, PokemonSpecies> = new Map(ALL_SPECIES.map((s) => [s.id, s]));

// Layer the real Mega Evolution roster, and generated regional forms (Alolan/Galarian/Hisuian/
// Paldean — see scripts/generate-pokedex.ts), onto whichever species object ended up at that id
// above (curated or generated). Mewtwo picks up two forms (X and Y) via two Mega table entries.
const GENERATED_REGIONAL_FORMS = generatedRegionalFormsData as { speciesId: string; form: PokemonForm }[];

for (const { speciesId, form } of [...MEGA_EVOLUTIONS, ...GENERATED_REGIONAL_FORMS]) {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) continue;
  if (!species.forms) species.forms = [];
  if (!species.forms.some((f) => f.id === form.id)) species.forms.push(form);
}

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
