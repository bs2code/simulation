import { findAbility } from "@/data/abilities";
import type { AbilityEffect, AbilityTrigger } from "@/types/abilities";
import type { WeatherId } from "@/types/battle";
import type { NonVolatileStatus, Pokemon, PokemonType } from "@/types/pokemon";

/**
 * Stateless ability-effect lookups. Every function here answers "what do the holder's
 * abilities say about X", filtering by trigger + effect kind — none of them know or care
 * which specific ability (Blaze, Levitate, ...) they're looking at.
 */
function effectsAt(pokemon: Pokemon, trigger: AbilityTrigger): AbilityEffect[] {
  const ability = findAbility(pokemon.ability);
  if (!ability || !ability.triggers.includes(trigger)) return [];
  return ability.effects;
}

export function getAbilityTypeImmunities(pokemon: Pokemon): PokemonType[] {
  return effectsAt(pokemon, "on-damage-calc-defender")
    .filter((e): e is Extract<AbilityEffect, { kind: "type-immunity" }> => e.kind === "type-immunity")
    .map((e) => e.type);
}

/** Combined multiplier from any low-HP same-type-boost abilities (Blaze/Torrent/Overgrow) that apply. */
export function getLowHpStabMultiplier(pokemon: Pokemon, moveType: PokemonType): number {
  const hpFraction = pokemon.currentHp / pokemon.stats.hp;
  return effectsAt(pokemon, "on-damage-calc-attacker")
    .filter((e): e is Extract<AbilityEffect, { kind: "low-hp-stab-boost" }> => e.kind === "low-hp-stab-boost")
    .filter((e) => e.type === moveType && hpFraction <= e.hpThreshold)
    .reduce((multiplier, e) => multiplier * e.multiplier, 1);
}

export function getWeatherStatMultiplier(
  pokemon: Pokemon,
  weather: WeatherId,
  stat: "speed" | "specialAttack"
): number {
  const trigger: AbilityTrigger = stat === "speed" ? "speed-calc" : "on-damage-calc-attacker";
  return effectsAt(pokemon, trigger)
    .filter(
      (e): e is Extract<AbilityEffect, { kind: "weather-stat-multiplier" }> =>
        e.kind === "weather-stat-multiplier"
    )
    .filter((e) => e.weather === weather && e.stat === stat)
    .reduce((multiplier, e) => multiplier * e.multiplier, 1);
}

export function getWeatherEndOfTurnHealFraction(pokemon: Pokemon, weather: WeatherId): number {
  return effectsAt(pokemon, "end-of-turn")
    .filter(
      (e): e is Extract<AbilityEffect, { kind: "weather-end-of-turn-heal" }> =>
        e.kind === "weather-end-of-turn-heal"
    )
    .filter((e) => e.weather === weather)
    .reduce((total, e) => total + e.fraction, 0);
}

export function getWeatherEndOfTurnDamageFraction(pokemon: Pokemon, weather: WeatherId): number {
  return effectsAt(pokemon, "end-of-turn")
    .filter(
      (e): e is Extract<AbilityEffect, { kind: "weather-end-of-turn-damage" }> =>
        e.kind === "weather-end-of-turn-damage"
    )
    .filter((e) => e.weather === weather)
    .reduce((total, e) => total + e.fraction, 0);
}

/** The defender's on-hit-by-move ability effects (e.g. Static's contact paralysis chance). */
export function getContactStatusChances(
  defender: Pokemon
): { status: NonVolatileStatus; chance: number }[] {
  return effectsAt(defender, "on-hit-by-move")
    .filter(
      (e): e is Extract<AbilityEffect, { kind: "contact-status-chance" }> =>
        e.kind === "contact-status-chance"
    )
    .map((e) => ({ status: e.status, chance: e.chance }));
}
