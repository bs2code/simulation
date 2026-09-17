import { findItem } from "@/data/items";
import type { ItemEffect, ItemTrigger } from "@/types/items";
import type { MoveCategory } from "@/types/moves";
import type { Pokemon, PokemonType } from "@/types/pokemon";

/** Stateless held-item lookups, mirroring AbilityEngine: dispatch on effect kind, not item id. */
function effectsAt(pokemon: Pokemon, trigger: ItemTrigger): ItemEffect[] {
  const item = findItem(pokemon.item);
  if (!item || !item.triggers.includes(trigger)) return [];
  return item.effects;
}

export function getItemDamageMultiplier(pokemon: Pokemon): number {
  return effectsAt(pokemon, "on-damage-calc-attacker")
    .filter((e): e is Extract<ItemEffect, { kind: "damage-multiplier" }> => e.kind === "damage-multiplier")
    .reduce((multiplier, e) => multiplier * e.multiplier, 1);
}

export function getItemTypePowerBoost(pokemon: Pokemon, moveType: PokemonType): number {
  return effectsAt(pokemon, "on-damage-calc-attacker")
    .filter((e): e is Extract<ItemEffect, { kind: "type-power-boost" }> => e.kind === "type-power-boost")
    .filter((e) => e.type === moveType)
    .reduce((multiplier, e) => multiplier * e.multiplier, 1);
}

export function getItemRecoilAfterAttackFraction(pokemon: Pokemon): number {
  return effectsAt(pokemon, "after-dealing-damage")
    .filter(
      (e): e is Extract<ItemEffect, { kind: "recoil-after-attack" }> => e.kind === "recoil-after-attack"
    )
    .reduce((total, e) => total + e.fraction, 0);
}

export function getItemEndOfTurnHealFraction(pokemon: Pokemon): number {
  return effectsAt(pokemon, "end-of-turn")
    .filter((e): e is Extract<ItemEffect, { kind: "end-of-turn-heal" }> => e.kind === "end-of-turn-heal")
    .reduce((total, e) => total + e.fraction, 0);
}

export function hasSurviveLethalHit(pokemon: Pokemon): boolean {
  return effectsAt(pokemon, "on-lethal-damage").some((e) => e.kind === "survive-lethal-hit");
}

/** Choice Band (attack) / Choice Specs (specialAttack) — 1.5x the holder's offensive stat for that category. */
export function getItemOffensiveStatMultiplier(pokemon: Pokemon, category: MoveCategory): number {
  if (category === "status") return 1;
  const stat = category === "physical" ? "attack" : "specialAttack";
  return effectsAt(pokemon, "on-damage-calc-attacker")
    .filter((e): e is Extract<ItemEffect, { kind: "stat-multiplier" }> => e.kind === "stat-multiplier" && e.stat === stat)
    .reduce((multiplier, e) => multiplier * e.multiplier, 1);
}

/** Choice Scarf — 1.5x the holder's Speed for turn-order purposes. */
export function getItemSpeedMultiplier(pokemon: Pokemon): number {
  return effectsAt(pokemon, "speed-calc")
    .filter((e): e is Extract<ItemEffect, { kind: "stat-multiplier" }> => e.kind === "stat-multiplier" && e.stat === "speed")
    .reduce((multiplier, e) => multiplier * e.multiplier, 1);
}

/** True for a Choice item (Band/Specs/Scarf) — not trigger-gated, so it bypasses `effectsAt`. */
function hasChoiceLockEffect(pokemon: Pokemon): boolean {
  return findItem(pokemon.item)?.effects.some((e) => e.kind === "choice-lock") ?? false;
}

/** The move a Choice item holder is locked into, or undefined if unlocked or not holding one. */
export function getChoiceLockedMoveId(pokemon: Pokemon): string | undefined {
  return hasChoiceLockEffect(pokemon) ? pokemon.choiceLockedMoveId : undefined;
}

/** Locks a Choice item holder into `moveId` the first time it's used this battle (no-op otherwise). */
export function lockChoiceItemMove(pokemon: Pokemon, moveId: string): void {
  if (hasChoiceLockEffect(pokemon)) pokemon.choiceLockedMoveId = moveId;
}
