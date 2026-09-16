import type { PokemonSpecies } from "@/types/pokemon";

/**
 * Species-level Pokédex data. Immutable and battle-agnostic — no HP, no stat stages,
 * no status. A small starter roster for Phase 1; more species are added purely as data.
 *
 * `forms` entries are how Mega Evolution / Gigantamax / Battle Bond are represented:
 * MechanicsEngine looks a form up by `formCategory` and, for Mega forms, checks the
 * holder's item against `requiredItem` — nothing about a specific species is hard-coded
 * into the engine itself.
 */
export const SPECIES_LIST: PokemonSpecies[] = [
  {
    id: "charizard",
    name: "Charizard",
    types: ["Fire", "Flying"],
    baseStats: { hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
    abilities: ["blaze", "solar-power"],
    moves: ["ember", "flamethrower", "aerial-ace", "dragon-claw", "swords-dance", "tackle", "earthquake"],
    forms: [
      {
        id: "charizard-mega-x",
        name: "Mega Charizard X",
        types: ["Fire", "Dragon"],
        baseStats: { hp: 78, attack: 130, defense: 111, specialAttack: 130, specialDefense: 85, speed: 100 },
        abilities: ["tough-claws"],
        formCategory: "mega",
        requiredItem: "charizardite-x",
      },
      {
        id: "charizard-mega-y",
        name: "Mega Charizard Y",
        types: ["Fire", "Flying"],
        baseStats: { hp: 78, attack: 104, defense: 78, specialAttack: 159, specialDefense: 115, speed: 100 },
        abilities: ["drought"],
        formCategory: "mega",
        requiredItem: "charizardite-y",
      },
      {
        id: "gigantamax-charizard",
        name: "Gigantamax Charizard",
        types: ["Fire", "Flying"],
        baseStats: { hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
        abilities: ["blaze", "solar-power"],
        formCategory: "gigantamax",
      },
    ],
  },
  {
    id: "blastoise",
    name: "Blastoise",
    types: ["Water"],
    baseStats: { hp: 79, attack: 83, defense: 100, specialAttack: 85, specialDefense: 105, speed: 78 },
    abilities: ["torrent", "rain-dish"],
    moves: ["water-gun", "hydro-pump", "surf", "tackle"],
  },
  {
    id: "venusaur",
    name: "Venusaur",
    types: ["Grass", "Poison"],
    baseStats: { hp: 80, attack: 82, defense: 83, specialAttack: 100, specialDefense: 100, speed: 80 },
    abilities: ["overgrow", "chlorophyll"],
    moves: ["vine-whip", "tackle", "growl", "swords-dance"],
  },
  {
    id: "pikachu",
    name: "Pikachu",
    types: ["Electric"],
    baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    abilities: ["static", "lightning-rod"],
    moves: ["thunderbolt", "quick-attack", "growl", "tackle"],
  },
  {
    id: "gengar",
    name: "Gengar",
    types: ["Ghost", "Poison"],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    abilities: ["cursed-body", "levitate"],
    moves: ["shadow-ball", "will-o-wisp", "ice-beam", "thunderbolt", "confuse-ray"],
  },
  {
    id: "greninja",
    name: "Greninja",
    types: ["Water", "Dark"],
    baseStats: { hp: 72, attack: 95, defense: 67, specialAttack: 103, specialDefense: 71, speed: 122 },
    abilities: ["torrent", "protean", "battle-bond"],
    moves: ["water-gun", "hydro-pump", "ice-beam", "quick-attack"],
    forms: [
      {
        id: "ash-greninja",
        name: "Ash-Greninja",
        types: ["Water", "Dark"],
        baseStats: { hp: 72, attack: 145, defense: 67, specialAttack: 153, specialDefense: 71, speed: 132 },
        abilities: ["battle-bond"],
        formCategory: "battle-bond",
      },
    ],
  },
  {
    id: "lucario",
    name: "Lucario",
    types: ["Fighting", "Steel"],
    baseStats: { hp: 70, attack: 110, defense: 70, specialAttack: 115, specialDefense: 70, speed: 90 },
    abilities: ["steadfast", "inner-focus"],
    moves: ["close-combat", "quick-attack", "swords-dance"],
    forms: [
      {
        id: "mega-lucario",
        name: "Mega Lucario",
        types: ["Fighting", "Steel"],
        baseStats: { hp: 70, attack: 145, defense: 88, specialAttack: 140, specialDefense: 70, speed: 112 },
        abilities: ["adaptability"],
        formCategory: "mega",
        requiredItem: "lucarionite",
      },
    ],
  },
  {
    id: "gallade",
    name: "Gallade",
    types: ["Psychic", "Fighting"],
    baseStats: { hp: 68, attack: 125, defense: 65, specialAttack: 65, specialDefense: 115, speed: 80 },
    abilities: ["steadfast", "sharpness"],
    moves: ["close-combat", "swords-dance", "quick-attack"],
    forms: [
      {
        id: "mega-gallade",
        name: "Mega Gallade",
        types: ["Psychic", "Fighting"],
        baseStats: { hp: 68, attack: 165, defense: 95, specialAttack: 65, specialDefense: 115, speed: 110 },
        abilities: ["inner-focus"],
        formCategory: "mega",
        requiredItem: "galladite",
      },
    ],
  },
  {
    id: "lycanroc",
    name: "Lycanroc",
    types: ["Rock"],
    baseStats: { hp: 75, attack: 115, defense: 65, specialAttack: 55, specialDefense: 65, speed: 112 },
    abilities: ["sand-rush", "steadfast"],
    // No mega/gigantamax form — Lycanroc's spec association is with Z-Moves, which (per this
    // engine's simplified model) any Pokémon can use by holding a Z-Crystal, not a species form.
    moves: ["quick-attack", "swords-dance"],
  },
];
