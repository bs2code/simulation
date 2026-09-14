import type { PokemonForm } from "@/types/pokemon";

/**
 * Permanent alternate forms picked at team-build time, same as the regional forms — not
 * unlocked via any in-battle mechanic. In the real games these are fixed by which Pokémon two
 * DNA Splicers fused together (Kyurem) or by a Trigger/event distinction (Deoxys), never by a
 * held item, so there's nothing for the battle engine to gate.
 */
export const ALTERNATE_FORMS: { speciesId: string; form: PokemonForm }[] = [
  {
    speciesId: "deoxys-normal",
    form: {
      id: "deoxys-attack",
      name: "Deoxys (Attack Forme)",
      types: ["Psychic"],
      baseStats: { hp: 50, attack: 180, defense: 20, specialAttack: 180, specialDefense: 20, speed: 150 },
      abilities: ["pressure"],
      formCategory: "alternate",
    },
  },
  {
    speciesId: "deoxys-normal",
    form: {
      id: "deoxys-defense",
      name: "Deoxys (Defense Forme)",
      types: ["Psychic"],
      baseStats: { hp: 50, attack: 70, defense: 160, specialAttack: 70, specialDefense: 160, speed: 90 },
      abilities: ["pressure"],
      formCategory: "alternate",
    },
  },
  {
    speciesId: "deoxys-normal",
    form: {
      id: "deoxys-speed",
      name: "Deoxys (Speed Forme)",
      types: ["Psychic"],
      baseStats: { hp: 50, attack: 95, defense: 90, specialAttack: 95, specialDefense: 90, speed: 180 },
      abilities: ["pressure"],
      formCategory: "alternate",
    },
  },
  {
    speciesId: "kyurem",
    form: {
      id: "kyurem-black",
      name: "Black Kyurem",
      types: ["Dragon", "Ice"],
      baseStats: { hp: 125, attack: 170, defense: 100, specialAttack: 120, specialDefense: 90, speed: 95 },
      abilities: ["teravolt"],
      formCategory: "alternate",
    },
  },
  {
    speciesId: "kyurem",
    form: {
      id: "kyurem-white",
      name: "White Kyurem",
      types: ["Dragon", "Ice"],
      baseStats: { hp: 125, attack: 120, defense: 90, specialAttack: 170, specialDefense: 100, speed: 95 },
      abilities: ["turboblaze"],
      formCategory: "alternate",
    },
  },
];
