import type { PokemonForm } from "@/types/pokemon";

/**
 * Forms that aren't a player-chosen BattleMechanic at all — in the real games, these Pokémon
 * simply take this form the instant they're sent into battle, as long as they're holding the
 * matching item (see MechanicsEngine.tryAutoActivateSwitchInForm, called on every switch-in:
 * the initial send-out and any mid-battle switch alike). Once transformed, a Pokémon stays that
 * way for the rest of the battle, same as this engine's Mega Evolution.
 */
export const SWITCH_IN_FORMS: { speciesId: string; form: PokemonForm }[] = [
  {
    speciesId: "groudon",
    form: {
      id: "primal-groudon",
      name: "Primal Groudon",
      types: ["Ground", "Fire"],
      baseStats: { hp: 100, attack: 180, defense: 160, specialAttack: 150, specialDefense: 90, speed: 90 },
      abilities: ["desolate-land"],
      formCategory: "primal",
      requiredItem: "red-orb",
      autoOnSwitchIn: true,
    },
  },
  {
    speciesId: "kyogre",
    form: {
      id: "primal-kyogre",
      name: "Primal Kyogre",
      types: ["Water"],
      baseStats: { hp: 100, attack: 150, defense: 90, specialAttack: 180, specialDefense: 160, speed: 90 },
      abilities: ["primordial-sea"],
      formCategory: "primal",
      requiredItem: "blue-orb",
      autoOnSwitchIn: true,
    },
  },
  {
    speciesId: "zacian",
    form: {
      id: "zacian-crowned",
      name: "Zacian (Crowned Sword)",
      types: ["Fairy", "Steel"],
      baseStats: { hp: 92, attack: 170, defense: 115, specialAttack: 80, specialDefense: 115, speed: 148 },
      abilities: ["intrepid-sword"],
      formCategory: "crowned",
      requiredItem: "rusted-sword",
      autoOnSwitchIn: true,
    },
  },
  {
    speciesId: "zamazenta",
    form: {
      id: "zamazenta-crowned",
      name: "Zamazenta (Crowned Shield)",
      types: ["Fighting", "Steel"],
      baseStats: { hp: 92, attack: 130, defense: 145, specialAttack: 80, specialDefense: 145, speed: 128 },
      abilities: ["dauntless-shield"],
      formCategory: "crowned",
      requiredItem: "rusted-shield",
      autoOnSwitchIn: true,
    },
  },
  {
    speciesId: "giratina-altered",
    form: {
      id: "giratina-origin",
      name: "Giratina (Origin Forme)",
      types: ["Ghost", "Dragon"],
      baseStats: { hp: 150, attack: 120, defense: 100, specialAttack: 120, specialDefense: 100, speed: 90 },
      abilities: ["levitate"],
      formCategory: "origin",
      requiredItem: "griseous-orb",
      autoOnSwitchIn: true,
    },
  },
];
