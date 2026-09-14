import type { PokemonForm } from "@/types/pokemon";

/**
 * Necrozma's Ultra Burst. The real games treat this as its own distinct mechanic rather than a
 * Mega Evolution, but the shape is identical for this engine's purposes (a player opts in via
 * the "mega" BattleMechanic toggle while holding the gating item), so it reuses that mechanic
 * directly instead of needing new engine code — see MechanicsEngine's mega-evolution gate, which
 * only ever checks `formCategory === "mega"` plus a matching held item or move.
 */
export const ULTRA_BURST_FORMS: { speciesId: string; form: PokemonForm }[] = [
  {
    speciesId: "necrozma",
    form: {
      id: "ultra-necrozma",
      name: "Ultra Necrozma",
      types: ["Psychic", "Dragon"],
      baseStats: { hp: 97, attack: 167, defense: 97, specialAttack: 167, specialDefense: 97, speed: 129 },
      abilities: ["neuroforce"],
      formCategory: "mega",
      requiredItem: "ultranecrozium-z",
    },
  },
];
