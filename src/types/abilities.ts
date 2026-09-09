import type { NonVolatileStatus, PokemonType } from "./pokemon";
import type { WeatherId } from "./battle";

/**
 * Points in a battle where an ability can activate. An ability lists every trigger it cares
 * about; the engine only ever asks "does this ability fire at trigger X", then reads whichever
 * effect kinds make sense for that context — nothing here is dispatched by ability id.
 */
export type AbilityTrigger =
  | "battle-start"
  | "switch-in"
  | "speed-calc"
  | "on-damage-calc-attacker"
  | "on-damage-calc-defender"
  | "on-hit-by-move"
  | "end-of-turn"
  | "on-faint";

export type AbilityEffect =
  /** Grants immunity to a move type entirely (Levitate vs Ground, Lightning Rod vs Electric). */
  | { kind: "type-immunity"; type: PokemonType }
  /** Boosts same-type moves when the holder is at or below an HP fraction (Blaze/Torrent/Overgrow). */
  | { kind: "low-hp-stab-boost"; type: PokemonType; hpThreshold: number; multiplier: number }
  /** Multiplies a stat while a given weather is active (Chlorophyll speed, Solar Power SpAtk). */
  | { kind: "weather-stat-multiplier"; weather: WeatherId; stat: "speed" | "specialAttack"; multiplier: number }
  /** Heals a fraction of max HP at end of turn while a given weather is active (Rain Dish). */
  | { kind: "weather-end-of-turn-heal"; weather: WeatherId; fraction: number }
  /** Damages a fraction of max HP at end of turn while a given weather is active (Solar Power). */
  | { kind: "weather-end-of-turn-damage"; weather: WeatherId; fraction: number }
  /** Chance to inflict a status on whatever made contact with the holder (Static). */
  | { kind: "contact-status-chance"; status: NonVolatileStatus; chance: number };

export type Ability = {
  id: string;
  name: string;
  triggers: AbilityTrigger[];
  effects: AbilityEffect[];
};
