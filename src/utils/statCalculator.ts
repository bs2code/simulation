import type { EVs, IVs, Nature, Stats, StatStages } from "@/types/pokemon";

/** Each nature boosts one stat by 10% and lowers a different one by 10%; neutral natures do neither. */
const NATURE_MODIFIERS: Record<Nature, { boosts?: keyof Omit<Stats, "hp">; lowers?: keyof Omit<Stats, "hp"> }> = {
  Hardy: {},
  Lonely: { boosts: "attack", lowers: "defense" },
  Brave: { boosts: "attack", lowers: "speed" },
  Adamant: { boosts: "attack", lowers: "specialAttack" },
  Naughty: { boosts: "attack", lowers: "specialDefense" },
  Bold: { boosts: "defense", lowers: "attack" },
  Docile: {},
  Relaxed: { boosts: "defense", lowers: "speed" },
  Impish: { boosts: "defense", lowers: "specialAttack" },
  Lax: { boosts: "defense", lowers: "specialDefense" },
  Timid: { boosts: "speed", lowers: "attack" },
  Hasty: { boosts: "speed", lowers: "defense" },
  Serious: {},
  Jolly: { boosts: "speed", lowers: "specialAttack" },
  Naive: { boosts: "speed", lowers: "specialDefense" },
  Modest: { boosts: "specialAttack", lowers: "attack" },
  Mild: { boosts: "specialAttack", lowers: "defense" },
  Quiet: { boosts: "specialAttack", lowers: "speed" },
  Bashful: {},
  Rash: { boosts: "specialAttack", lowers: "specialDefense" },
  Calm: { boosts: "specialDefense", lowers: "attack" },
  Gentle: { boosts: "specialDefense", lowers: "defense" },
  Sassy: { boosts: "specialDefense", lowers: "speed" },
  Careful: { boosts: "specialDefense", lowers: "specialAttack" },
  Quirky: {},
};

function natureMultiplier(nature: Nature, stat: keyof Omit<Stats, "hp">): number {
  const modifier = NATURE_MODIFIERS[nature];
  if (modifier.boosts === stat) return 1.1;
  if (modifier.lowers === stat) return 0.9;
  return 1;
}

/**
 * Standard main-series stat formula. Distinguishes base stats (species data) from the
 * calculated stats a battle Pokémon actually uses, factoring in level, IVs, EVs, and nature.
 */
export function calculateStats(
  baseStats: Stats,
  level: number,
  nature: Nature,
  ivs: IVs,
  evs: EVs
): Stats {
  const hp = Math.floor(
    ((2 * baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100 + level + 10
  );

  const calcOther = (stat: keyof Omit<Stats, "hp">): number => {
    const raw = Math.floor(
      ((2 * baseStats[stat] + ivs[stat] + Math.floor(evs[stat] / 4)) * level) / 100 + 5
    );
    return Math.floor(raw * natureMultiplier(nature, stat));
  };

  return {
    hp,
    attack: calcOther("attack"),
    defense: calcOther("defense"),
    specialAttack: calcOther("specialAttack"),
    specialDefense: calcOther("specialDefense"),
    speed: calcOther("speed"),
  };
}

/** Stat stages for Attack/Defense/SpAtk/SpDef/Speed range -6..+6 using an (x+2)/2 style ratio. */
export function getStatStageMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  return clamped >= 0 ? (2 + clamped) / 2 : 2 / (2 - clamped);
}

/** Accuracy/evasion stages use a different ratio table: (3+x)/3 for positive, 3/(3-x) for negative. */
export function getAccuracyStageMultiplier(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage));
  return clamped >= 0 ? (3 + clamped) / 3 : 3 / (3 - clamped);
}

export function applyStatStage(baseValue: number, stage: number): number {
  return Math.floor(baseValue * getStatStageMultiplier(stage));
}

export type ModifiableStat = keyof Omit<StatStages, "accuracy" | "evasion">;
