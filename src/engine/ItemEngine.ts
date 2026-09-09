import { findItem } from "@/data/items";
import type { ItemEffect, ItemTrigger } from "@/types/items";
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
