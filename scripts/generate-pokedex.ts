/**
 * Generates the bulk Pokédex data (species/moves/abilities) from PokeAPI's public CSV export
 * (the same source PokeAPI itself is built from: github.com/PokeAPI/pokeapi/tree/master/data/v2/csv).
 *
 * This produces *base* data only — accurate types/base-stats/movepools/ability lists for every
 * species, and accurate type/power/accuracy/category/priority/PP/flags for every move. It does
 * NOT attempt to replicate every move's unique in-game effect or every ability's mechanic — this
 * engine's MoveEffect/AbilityEffect vocabulary is intentionally small (see Phase 3/4), and most
 * of the ~900 real moves and ~300 real abilities don't map onto it. Generated moves/abilities get
 * effects: [] (moves still get accurate flags: contact/sound/punch/bite/bullet/pulse/powder/
 * protectable, derived from PokeAPI's move-flag data) rather than a wrong or invented mechanic.
 *
 * Hand-curated species (data/pokemon/speciesList.ts), moves (data/moves/moveList.ts), and
 * abilities (data/abilities/abilityList.ts) — the ones with real engine effects and, for
 * species, Mega/Gigantamax/Battle Bond forms — always take precedence over this generated data;
 * see the merge in each data module's index.ts. Re-running this script never touches curated data.
 *
 * Only each species' *default* form is imported (no regional forms/megas/gigantamax beyond the
 * hand-curated roster) — building an accurate forms system for ~1000 species is future work.
 *
 * Usage: npx tsx scripts/generate-pokedex.ts
 * (Downloaded CSVs are cached under .cache/pokedex-csv/, gitignored, so re-runs are fast.)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Move, MoveCategory, MoveFlags } from "@/types/moves";
import type { PokemonType } from "@/types/pokemon";

const CSV_BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const CACHE_DIR = path.resolve(__dirname, "../.cache/pokedex-csv");
const ENGLISH_LANGUAGE_ID = "9";

const TYPE_SLUG_TO_OUR_TYPE: Record<string, PokemonType> = {
  normal: "Normal",
  fire: "Fire",
  water: "Water",
  electric: "Electric",
  grass: "Grass",
  ice: "Ice",
  fighting: "Fighting",
  poison: "Poison",
  ground: "Ground",
  flying: "Flying",
  psychic: "Psychic",
  bug: "Bug",
  rock: "Rock",
  ghost: "Ghost",
  dragon: "Dragon",
  dark: "Dark",
  steel: "Steel",
  fairy: "Fairy",
};

const STAT_SLUG_TO_OUR_KEY: Record<string, string> = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  "special-attack": "specialAttack",
  "special-defense": "specialDefense",
  speed: "speed",
};

const DAMAGE_CLASS_SLUG_TO_CATEGORY: Record<string, MoveCategory> = {
  status: "status",
  physical: "physical",
  special: "special",
};

const MOVE_FLAG_SLUG_TO_OUR_FLAG: Record<string, keyof MoveFlags> = {
  contact: "contact",
  sound: "sound",
  punch: "punch",
  bite: "bite",
  ballistics: "bullet",
  pulse: "pulse",
  powder: "powder",
  protect: "protectable",
};

type Row = Record<string, string>;

async function fetchCsv(name: string): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, `${name}.csv`);
  try {
    return await readFile(cachePath, "utf-8");
  } catch {
    // not cached yet
  }
  console.log(`Fetching ${name}.csv...`);
  const res = await fetch(`${CSV_BASE}/${name}.csv`);
  if (!res.ok) throw new Error(`Failed to fetch ${name}.csv: ${res.status}`);
  const text = await res.text();
  await writeFile(cachePath, text, "utf-8");
  return text;
}

/** Minimal RFC4180-ish CSV parser: handles quoted fields with embedded commas (no embedded newlines in this dataset). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split("\n")) {
    if (line.length === 0) continue;
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.replace(/\r$/, ""));
    rows.push(fields);
  }
  return rows;
}

async function loadRows(name: string): Promise<Row[]> {
  const rows = parseCsv(await fetchCsv(name));
  const [header, ...body] = rows;
  return body.map((row) => Object.fromEntries(header.map((key, i) => [key, row[i] ?? ""])));
}

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function writeJson(relativePath: string, data: unknown) {
  const fullPath = path.resolve(__dirname, "..", relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(data), "utf-8");
  console.log(`Wrote ${relativePath} (${JSON.stringify(data).length} bytes)`);
}

function englishNameByForeignKey(rows: Row[], keyField: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.local_language_id === ENGLISH_LANGUAGE_ID) map.set(row[keyField], row.name);
  }
  return map;
}

async function main() {
  const [
    pokemonRows,
    speciesNameRows,
    statsRows,
    statRefRows,
    typeRefRows,
    pokemonTypeRows,
    abilityAssocRows,
    abilityRows,
    abilityNameRows,
    moveRows,
    moveNameRows,
    moveFlagRefRows,
    moveFlagMapRows,
    moveDamageClassRows,
    pokemonMoveRows,
  ] = await Promise.all([
    loadRows("pokemon"),
    loadRows("pokemon_species_names"),
    loadRows("pokemon_stats"),
    loadRows("stats"),
    loadRows("types"),
    loadRows("pokemon_types"),
    loadRows("pokemon_abilities"),
    loadRows("abilities"),
    loadRows("ability_names"),
    loadRows("moves"),
    loadRows("move_names"),
    loadRows("move_flags"),
    loadRows("move_flag_map"),
    loadRows("move_damage_classes"),
    loadRows("pokemon_moves"),
  ]);

  console.log(
    `Loaded ${pokemonRows.length} pokemon, ${moveRows.length} moves, ${abilityRows.length} abilities, ${pokemonMoveRows.length} pokemon-move rows`
  );

  // --- reference lookups (id -> slug/key) ---
  const statIdToKey = new Map<string, string>();
  for (const row of statRefRows) {
    const key = STAT_SLUG_TO_OUR_KEY[row.identifier];
    if (key) statIdToKey.set(row.id, key);
  }

  const typeIdToSlug = new Map<string, string>();
  for (const row of typeRefRows) typeIdToSlug.set(row.id, row.identifier);

  const damageClassIdToSlug = new Map<string, string>();
  for (const row of moveDamageClassRows) damageClassIdToSlug.set(row.id, row.identifier);

  const moveFlagIdToSlug = new Map<string, string>();
  for (const row of moveFlagRefRows) moveFlagIdToSlug.set(row.id, row.identifier);

  const abilityIdToSlug = new Map<string, string>();
  for (const row of abilityRows) abilityIdToSlug.set(row.id, row.identifier);

  const moveIdToSlug = new Map<string, string>();
  for (const row of moveRows) moveIdToSlug.set(row.id, row.identifier);

  const abilityNameById = englishNameByForeignKey(abilityNameRows, "ability_id");
  const moveNameById = englishNameByForeignKey(moveNameRows, "move_id");
  const speciesNameBySpeciesId = englishNameByForeignKey(speciesNameRows, "pokemon_species_id");

  const moveFlagSlugsByMoveId = new Map<string, Set<string>>();
  for (const row of moveFlagMapRows) {
    const slug = moveFlagIdToSlug.get(row.move_flag_id);
    if (!slug) continue;
    if (!moveFlagSlugsByMoveId.has(row.move_id)) moveFlagSlugsByMoveId.set(row.move_id, new Set());
    moveFlagSlugsByMoveId.get(row.move_id)!.add(slug);
  }

  // --- moves ---
  const generatedMoves: Move[] = [];
  for (const row of moveRows) {
    const type = TYPE_SLUG_TO_OUR_TYPE[typeIdToSlug.get(row.type_id) ?? ""];
    if (!type) continue; // skip types this engine doesn't model (unknown/shadow/stellar)
    const category = DAMAGE_CLASS_SLUG_TO_CATEGORY[damageClassIdToSlug.get(row.damage_class_id) ?? ""];
    if (!category) continue;

    const flagSlugs = moveFlagSlugsByMoveId.get(row.id) ?? new Set<string>();
    const flags: MoveFlags = {};
    for (const [pokeApiFlag, ourFlag] of Object.entries(MOVE_FLAG_SLUG_TO_OUR_FLAG)) {
      if (flagSlugs.has(pokeApiFlag)) flags[ourFlag] = true;
    }

    generatedMoves.push({
      id: row.identifier,
      name: moveNameById.get(row.id) ?? titleCaseFromSlug(row.identifier),
      type,
      category,
      power: row.power ? Number(row.power) : undefined,
      accuracy: row.accuracy ? Number(row.accuracy) : undefined,
      priority: Number(row.priority) || 0,
      maxPP: row.pp ? Number(row.pp) : 5,
      target: "single-opponent",
      effects: [],
      flags,
    });
  }
  console.log(`Generated ${generatedMoves.length} moves`);
  await writeJson("src/data/moves/generated/moves.generated.json", generatedMoves);

  // --- abilities ---
  const generatedAbilities = abilityRows
    .filter((row) => row.is_main_series === "1")
    .map((row) => ({
      id: row.identifier,
      name: abilityNameById.get(row.id) ?? titleCaseFromSlug(row.identifier),
      triggers: [] as string[],
      effects: [] as unknown[],
    }));
  console.log(`Generated ${generatedAbilities.length} abilities`);
  await writeJson("src/data/abilities/generated/abilities.generated.json", generatedAbilities);

  // --- species (default form only) ---
  const statsByPokemonId = new Map<string, Record<string, number>>();
  for (const row of statsRows) {
    const key = statIdToKey.get(row.stat_id);
    if (!key) continue;
    if (!statsByPokemonId.has(row.pokemon_id)) statsByPokemonId.set(row.pokemon_id, {});
    statsByPokemonId.get(row.pokemon_id)![key] = Number(row.base_stat);
  }

  const typesByPokemonId = new Map<string, { slot: number; type: PokemonType }[]>();
  for (const row of pokemonTypeRows) {
    const type = TYPE_SLUG_TO_OUR_TYPE[typeIdToSlug.get(row.type_id) ?? ""];
    if (!type) continue;
    if (!typesByPokemonId.has(row.pokemon_id)) typesByPokemonId.set(row.pokemon_id, []);
    typesByPokemonId.get(row.pokemon_id)!.push({ slot: Number(row.slot), type });
  }

  const abilitiesByPokemonId = new Map<string, string[]>();
  for (const row of abilityAssocRows) {
    const slug = abilityIdToSlug.get(row.ability_id);
    if (!slug) continue;
    if (!abilitiesByPokemonId.has(row.pokemon_id)) abilitiesByPokemonId.set(row.pokemon_id, []);
    abilitiesByPokemonId.get(row.pokemon_id)!.push(slug);
  }

  const movesByPokemonId = new Map<string, Set<string>>();
  for (const row of pokemonMoveRows) {
    const slug = moveIdToSlug.get(row.move_id);
    if (!slug) continue;
    if (!movesByPokemonId.has(row.pokemon_id)) movesByPokemonId.set(row.pokemon_id, new Set());
    movesByPokemonId.get(row.pokemon_id)!.add(slug);
  }

  const generatedSpecies: {
    id: string;
    name: string;
    types: PokemonType[];
    baseStats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number };
    abilities: string[];
    moves: string[];
  }[] = [];

  let skippedNoStats = 0;
  let skippedNoMovesOrAbilities = 0;

  for (const row of pokemonRows) {
    if (row.is_default !== "1") continue;
    const baseStats = statsByPokemonId.get(row.id);
    const types = (typesByPokemonId.get(row.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type);
    if (!baseStats || types.length === 0) {
      skippedNoStats++;
      continue;
    }

    const moves = Array.from(movesByPokemonId.get(row.id) ?? []);
    const abilities = abilitiesByPokemonId.get(row.id) ?? [];
    if (moves.length === 0 || abilities.length === 0) {
      skippedNoMovesOrAbilities++;
      continue;
    }

    generatedSpecies.push({
      id: row.identifier,
      name: speciesNameBySpeciesId.get(row.species_id) ?? titleCaseFromSlug(row.identifier),
      types,
      baseStats: {
        hp: baseStats.hp ?? 1,
        attack: baseStats.attack ?? 1,
        defense: baseStats.defense ?? 1,
        specialAttack: baseStats.specialAttack ?? 1,
        specialDefense: baseStats.specialDefense ?? 1,
        speed: baseStats.speed ?? 1,
      },
      abilities,
      moves,
    });
  }

  console.log(
    `Generated ${generatedSpecies.length} species (skipped ${skippedNoStats} missing stats/types, ${skippedNoMovesOrAbilities} missing moves/abilities)`
  );
  await writeJson("src/data/pokemon/generated/species.generated.json", generatedSpecies);

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
