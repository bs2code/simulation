import type { PokemonType, StatStages } from "./pokemon";

export type MoveCategory = "physical" | "special" | "status";

export type MoveTarget =
  | "single-opponent"
  | "all-opponents"
  | "self"
  | "single-ally"
  | "all-allies"
  | "field"
  | "user-side"
  | "opponent-side";

/** Flags describing move behavior that many systems (abilities, items, protect) key off of. */
export type MoveFlags = {
  contact?: boolean;
  sound?: boolean;
  punch?: boolean;
  bite?: boolean;
  bullet?: boolean;
  pulse?: boolean;
  slicing?: boolean;
  powder?: boolean;
  protectable?: boolean;
  authenticatesThroughSubstitute?: boolean;
};

export type StatChangeEffect = {
  kind: "stat-change";
  target: "self" | "opponent";
  stat: keyof StatStages;
  stages: number;
  /** Chance out of 100 that this effect triggers. Omit for guaranteed (100). */
  chance?: number;
};

export type StatusEffect = {
  kind: "status";
  target: "self" | "opponent";
  status: "burn" | "freeze" | "paralysis" | "poison" | "badly-poisoned" | "sleep";
  chance?: number;
};

export type VolatileEffect = {
  kind: "volatile";
  target: "self" | "opponent";
  volatile: string;
  chance?: number;
  turns?: number;
};

export type FlinchEffect = {
  kind: "flinch";
  chance?: number;
};

export type HealEffect = {
  kind: "heal";
  target: "self" | "opponent";
  /** Fraction of the target's max HP, e.g. 0.5 for a 50% heal. */
  fraction: number;
};

export type RecoilEffect = {
  kind: "recoil";
  /** Fraction of the damage dealt returned to the user, e.g. 0.33. */
  fraction: number;
};

export type MultiHitEffect = {
  kind: "multi-hit";
  minHits: number;
  maxHits: number;
};

export type WeatherEffect = {
  kind: "weather";
  weather: "sun" | "rain" | "sandstorm" | "hail" | "snow";
  turns?: number;
};

export type TerrainEffect = {
  kind: "terrain";
  terrain: "electric" | "grassy" | "misty" | "psychic";
  turns?: number;
};

export type HazardEffect = {
  kind: "hazard";
  target: "opponent-side" | "self-side";
  hazard: "stealth-rock" | "spikes" | "toxic-spikes" | "sticky-web";
};

/**
 * Data-driven move effects. The engine dispatches on `kind` rather than branching on move id,
 * so new move behaviors are added by composing effects, not by editing engine code.
 */
export type MoveEffect =
  | StatChangeEffect
  | StatusEffect
  | VolatileEffect
  | FlinchEffect
  | HealEffect
  | RecoilEffect
  | MultiHitEffect
  | WeatherEffect
  | TerrainEffect
  | HazardEffect;

/** Species-independent move definition, keyed by id. */
export type Move = {
  id: string;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power?: number;
  accuracy?: number;
  /** Priority bracket; 0 is normal speed, positive moves first, negative last. */
  priority: number;
  maxPP: number;
  target: MoveTarget;
  effects: MoveEffect[];
  flags: MoveFlags;
  description?: string;
};

/** A move as held by a specific Pokémon instance: tracks remaining PP. */
export type BattleMove = {
  moveId: string;
  currentPP: number;
  maxPP: number;
  /** True if temporarily disabled (Disable, Torment, Taunt, etc). */
  disabled?: boolean;
};

export function createBattleMove(move: Move): BattleMove {
  return { moveId: move.id, currentPP: move.maxPP, maxPP: move.maxPP };
}
