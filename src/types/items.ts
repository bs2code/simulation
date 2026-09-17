import type { PokemonType } from "./pokemon";

export type ItemTrigger =
  | "end-of-turn"
  | "on-damage-calc-attacker"
  | "speed-calc"
  | "after-dealing-damage"
  | "on-lethal-damage";

export type ItemEffect =
  /** Heals a fraction of max HP at end of turn (Leftovers). */
  | { kind: "end-of-turn-heal"; fraction: number }
  /** Flat multiplier applied to any damage the holder deals (Life Orb). */
  | { kind: "damage-multiplier"; multiplier: number }
  /** Holder loses a fraction of its own max HP after dealing damage (Life Orb). */
  | { kind: "recoil-after-attack"; fraction: number }
  /** Boosts moves of a specific type (Charcoal, Mystic Water, etc). */
  | { kind: "type-power-boost"; type: PokemonType; multiplier: number }
  /** Survive a hit that would otherwise KO from full HP, at 1 HP, then the item is consumed (Focus Sash). */
  | { kind: "survive-lethal-hit" }
  /** Multiplies one stat outright (Choice Band/Specs/Scarf). */
  | { kind: "stat-multiplier"; stat: "attack" | "specialAttack" | "speed"; multiplier: number }
  /**
   * Locks the holder into repeating whichever move it used this turn until it switches out
   * (Choice Band/Specs/Scarf) — see ItemEngine's getChoiceLockedMoveId/lockChoiceItemMove.
   */
  | { kind: "choice-lock" };

export type Item = {
  id: string;
  name: string;
  triggers: ItemTrigger[];
  effects: ItemEffect[];
};
