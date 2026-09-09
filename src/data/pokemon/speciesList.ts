import type { PokemonSpecies } from "@/types/pokemon";

/**
 * Species-level Pokédex data. Immutable and battle-agnostic — no HP, no stat stages,
 * no status. A small starter roster for Phase 1; more species are added purely as data.
 */
export const SPECIES_LIST: PokemonSpecies[] = [
  {
    id: "charizard",
    name: "Charizard",
    types: ["Fire", "Flying"],
    baseStats: { hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
    abilities: ["blaze", "solar-power"],
    moves: ["ember", "flamethrower", "aerial-ace", "dragon-claw", "swords-dance", "tackle"],
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
    moves: ["shadow-ball", "will-o-wisp", "ice-beam", "thunderbolt"],
  },
  {
    id: "greninja",
    name: "Greninja",
    types: ["Water", "Dark"],
    baseStats: { hp: 72, attack: 95, defense: 67, specialAttack: 103, specialDefense: 71, speed: 122 },
    abilities: ["torrent", "protean", "battle-bond"],
    moves: ["water-gun", "hydro-pump", "ice-beam", "quick-attack"],
  },
];
