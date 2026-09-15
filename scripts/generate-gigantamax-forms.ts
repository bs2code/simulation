/**
 * Builds src/data/pokemon/generated/gigantamax-forms.generated.json — the real Gigantamax
 * roster (Sword/Shield base game + Isle of Armor/Crown Tundra DLC), minus Charizard (already
 * hand-curated directly on speciesList.ts).
 *
 * Gigantamax doesn't change a Pokémon's types, base stats, or abilities in the real games (only
 * its size/appearance and access to G-Max moves) — this engine already applies the HP-doubling
 * generically in MechanicsEngine's activateMechanic, so each entry here just copies its species'
 * existing types/baseStats/abilities from the already-built Pokédex rather than retyping them
 * (avoids transcription drift). Run via `npx tsx scripts/generate-gigantamax-forms.ts` whenever
 * the roster needs to change; the output is committed so the app doesn't need this script at
 * runtime.
 *
 * Galarian Meowth is the one exception: its Gigantamax form is hardcoded with Galarian Meowth's
 * own types/stats/abilities (Steel-type) rather than looked up from the base "meowth" species
 * (which is Normal-type Alolan/Kantonian Meowth) — see the inline entry below. This is also the
 * one species in this table with a real-game caveat this engine doesn't model: only the
 * *Galarian* form can actually Gigantamax, but forms attach at the species level here (same
 * simplification already used for every mega/gigantamax form), so selecting any of Meowth's
 * forms exposes the same Gigantamax option.
 */
import { writeFileSync } from "node:fs";
import { getSpecies } from "@/data/pokemon";
import type { PokemonForm } from "@/types/pokemon";

const ROSTER: { speciesId: string; id: string; name: string }[] = [
  { speciesId: "venusaur", id: "gigantamax-venusaur", name: "Gigantamax Venusaur" },
  { speciesId: "blastoise", id: "gigantamax-blastoise", name: "Gigantamax Blastoise" },
  { speciesId: "butterfree", id: "gigantamax-butterfree", name: "Gigantamax Butterfree" },
  { speciesId: "pikachu", id: "gigantamax-pikachu", name: "Gigantamax Pikachu" },
  { speciesId: "machamp", id: "gigantamax-machamp", name: "Gigantamax Machamp" },
  { speciesId: "gengar", id: "gigantamax-gengar", name: "Gigantamax Gengar" },
  { speciesId: "kingler", id: "gigantamax-kingler", name: "Gigantamax Kingler" },
  { speciesId: "lapras", id: "gigantamax-lapras", name: "Gigantamax Lapras" },
  { speciesId: "eevee", id: "gigantamax-eevee", name: "Gigantamax Eevee" },
  { speciesId: "snorlax", id: "gigantamax-snorlax", name: "Gigantamax Snorlax" },
  { speciesId: "garbodor", id: "gigantamax-garbodor", name: "Gigantamax Garbodor" },
  { speciesId: "melmetal", id: "gigantamax-melmetal", name: "Gigantamax Melmetal" },
  { speciesId: "rillaboom", id: "gigantamax-rillaboom", name: "Gigantamax Rillaboom" },
  { speciesId: "cinderace", id: "gigantamax-cinderace", name: "Gigantamax Cinderace" },
  { speciesId: "inteleon", id: "gigantamax-inteleon", name: "Gigantamax Inteleon" },
  { speciesId: "corviknight", id: "gigantamax-corviknight", name: "Gigantamax Corviknight" },
  { speciesId: "orbeetle", id: "gigantamax-orbeetle", name: "Gigantamax Orbeetle" },
  { speciesId: "drednaw", id: "gigantamax-drednaw", name: "Gigantamax Drednaw" },
  { speciesId: "coalossal", id: "gigantamax-coalossal", name: "Gigantamax Coalossal" },
  { speciesId: "flapple", id: "gigantamax-flapple", name: "Gigantamax Flapple" },
  { speciesId: "appletun", id: "gigantamax-appletun", name: "Gigantamax Appletun" },
  { speciesId: "sandaconda", id: "gigantamax-sandaconda", name: "Gigantamax Sandaconda" },
  { speciesId: "toxtricity-amped", id: "gigantamax-toxtricity", name: "Gigantamax Toxtricity" },
  { speciesId: "centiskorch", id: "gigantamax-centiskorch", name: "Gigantamax Centiskorch" },
  { speciesId: "hatterene", id: "gigantamax-hatterene", name: "Gigantamax Hatterene" },
  { speciesId: "grimmsnarl", id: "gigantamax-grimmsnarl", name: "Gigantamax Grimmsnarl" },
  { speciesId: "alcremie", id: "gigantamax-alcremie", name: "Gigantamax Alcremie" },
  { speciesId: "copperajah", id: "gigantamax-copperajah", name: "Gigantamax Copperajah" },
  { speciesId: "duraludon", id: "gigantamax-duraludon", name: "Gigantamax Duraludon" },
  {
    speciesId: "urshifu-single-strike",
    id: "gigantamax-urshifu-single-strike",
    name: "Gigantamax Urshifu (Single Strike Style)",
  },
];

const entries: { speciesId: string; form: PokemonForm }[] = ROSTER.map(({ speciesId, id, name }) => {
  const species = getSpecies(speciesId);
  return {
    speciesId,
    form: {
      id,
      name,
      types: species.types,
      baseStats: species.baseStats,
      abilities: species.abilities,
      formCategory: "gigantamax",
    },
  };
});

// Galarian Meowth's Gigantamax form uses its own (Steel-type) stats, not the base "meowth"
// species' — see the file-level doc comment above.
entries.push({
  speciesId: "meowth",
  form: {
    id: "gigantamax-meowth",
    name: "Gigantamax Meowth",
    types: ["Steel"],
    baseStats: { hp: 50, attack: 65, defense: 55, specialAttack: 40, specialDefense: 40, speed: 40 },
    abilities: ["pickup", "tough-claws", "unnerve"],
    formCategory: "gigantamax",
  },
});

const outPath = new URL("../src/data/pokemon/generated/gigantamax-forms.generated.json", import.meta.url);
writeFileSync(outPath, JSON.stringify(entries, null, 2) + "\n");
console.log(`Wrote ${entries.length} Gigantamax forms to ${outPath.pathname}`);
