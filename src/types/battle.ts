/**
 * Battle-wide types. Phase 1 only needs the damage-calculation slice of this file;
 * BattleState/TurnEngine/BattleEvent land in Phase 2 and are intentionally not defined yet
 * so we don't build ahead of what the engine can actually do.
 */

export type WeatherId = "none" | "sun" | "rain" | "sandstorm" | "hail" | "snow";
export type TerrainId = "none" | "electric" | "grassy" | "misty" | "psychic";

/** Environmental/situational inputs the damage engine needs but does not own. */
export type DamageContext = {
  weather?: WeatherId;
  terrain?: TerrainId;
  /** True when the move is hitting multiple targets at once (applies a spread-move penalty). */
  isSpreadMove?: boolean;
  /** Force a specific crit outcome; used by tests. When omitted the engine rolls it via RNG. */
  forceCritical?: boolean;
  /** Force a specific damage roll (85-100); used by tests. When omitted the engine rolls it via RNG. */
  forceRandomRoll?: number;
};

/** Full breakdown of a single damage calculation, returned so the UI can narrate it. */
export type DamageResult = {
  damage: number;
  critical: boolean;
  effectiveness: number;
  randomModifier: number;
  boostedByWeather: boolean;
  resisted: boolean;
  superEffective: boolean;
  /** True if the move type matched one of the attacker's types (STAB applied). */
  stab: boolean;
  /** True when effectiveness is exactly 0 (immune). */
  immune: boolean;
};
