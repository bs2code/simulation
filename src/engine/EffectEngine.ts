import { findAbility } from "@/data/abilities";
import { getTypeMultiplier } from "@/data/types/typeChart";
import type { RNG } from "@/utils/rng";
import { getPokemonTypes } from "@/utils/pokemonTypes";
import type { BattleEvent, BattleSide, BattleSideId, BattleState, TerrainId } from "@/types/battle";
import { createDefaultStatus, type NonVolatileStatus, type Pokemon } from "@/types/pokemon";
import {
  getWeatherEndOfTurnDamageFraction,
  getWeatherEndOfTurnHealFraction,
} from "./AbilityEngine";
import { getItemEndOfTurnHealFraction } from "./ItemEngine";
import { getWeatherDamageFraction, tickWeatherAndTerrain } from "./WeatherEngine";

const CONFUSION_SELF_HIT_CHANCE = 1 / 3;
const CONFUSION_MIN_TURNS = 2;
const CONFUSION_MAX_TURNS = 5;
const SLEEP_MIN_TURNS = 1;
const SLEEP_MAX_TURNS = 3;
const FREEZE_THAW_CHANCE = 0.2;
const FULL_PARALYSIS_CHANCE = 0.25;

// ---------------------------------------------------------------------------
// Status application
// ---------------------------------------------------------------------------

function isImmuneToStatus(pokemon: Pokemon, status: NonVolatileStatus): boolean {
  const types = getPokemonTypes(pokemon);
  switch (status) {
    case "burn":
      return types.includes("Fire");
    case "freeze":
      return types.includes("Ice");
    case "paralysis":
      return types.includes("Electric");
    case "poison":
    case "badly-poisoned":
      return types.includes("Poison") || types.includes("Steel");
    default:
      return false;
  }
}

export function canApplyStatus(pokemon: Pokemon, status: NonVolatileStatus, terrain: TerrainId): boolean {
  if (pokemon.fainted) return false;
  if (pokemon.status.condition !== "none") return false;
  if (isImmuneToStatus(pokemon, status)) return false;
  if (terrain === "misty") return false;
  if (terrain === "electric" && status === "sleep") return false;
  return true;
}

/** Attempts to inflict a major status, respecting type immunities and terrain. Returns success. */
export function applyStatus(
  pokemon: Pokemon,
  status: NonVolatileStatus,
  terrain: TerrainId,
  rng: RNG
): boolean {
  if (!canApplyStatus(pokemon, status, terrain)) return false;
  const counter =
    status === "sleep" ? rng.integer(SLEEP_MIN_TURNS, SLEEP_MAX_TURNS) : status === "badly-poisoned" ? 1 : undefined;
  pokemon.status = { condition: status, counter };
  return true;
}

export function addVolatileStatus(pokemon: Pokemon, id: "flinch"): void {
  if (pokemon.volatileStatuses.some((v) => v.id === id)) return;
  pokemon.volatileStatuses.push({ id });
}

export function addConfusion(pokemon: Pokemon, rng: RNG): boolean {
  if (pokemon.volatileStatuses.some((v) => v.id === "confusion")) return false;
  pokemon.volatileStatuses.push({
    id: "confusion",
    turnsRemaining: rng.integer(CONFUSION_MIN_TURNS, CONFUSION_MAX_TURNS),
  });
  return true;
}

// ---------------------------------------------------------------------------
// Can-act gate: sleep / freeze / paralysis / flinch / confusion, checked in that order.
// Mutates the Pokémon's status/volatiles in place (waking up, consuming flinch, etc) and
// reports whether the move should proceed this turn.
// ---------------------------------------------------------------------------

export type ActionGateResult = { canAct: boolean; events: BattleEvent[] };

function confusionSelfDamage(pokemon: Pokemon): number {
  const attack = pokemon.stats.attack;
  const defense = pokemon.stats.defense;
  const power = 40;
  return Math.floor((Math.floor((2 * pokemon.level) / 5 + 2) * power * (attack / defense)) / 50) + 2;
}

export function checkCanAct(pokemon: Pokemon, side: BattleSideId, rng: RNG): ActionGateResult {
  const events: BattleEvent[] = [];

  if (pokemon.status.condition === "sleep") {
    const remaining = (pokemon.status.counter ?? 1) - 1;
    if (remaining <= 0) {
      pokemon.status = createDefaultStatus();
      events.push({ type: "status-cured", side, pokemonId: pokemon.id, status: "sleep" });
    } else {
      pokemon.status.counter = remaining;
      events.push({ type: "move-prevented", side, pokemonId: pokemon.id, reason: "sleep" });
      return { canAct: false, events };
    }
  }

  if (pokemon.status.condition === "freeze") {
    if (rng.chance(FREEZE_THAW_CHANCE)) {
      pokemon.status = createDefaultStatus();
      events.push({ type: "status-cured", side, pokemonId: pokemon.id, status: "freeze" });
    } else {
      events.push({ type: "move-prevented", side, pokemonId: pokemon.id, reason: "frozen" });
      return { canAct: false, events };
    }
  }

  const flinchIndex = pokemon.volatileStatuses.findIndex((v) => v.id === "flinch");
  if (flinchIndex !== -1) {
    pokemon.volatileStatuses.splice(flinchIndex, 1);
    events.push({ type: "move-prevented", side, pokemonId: pokemon.id, reason: "flinch" });
    return { canAct: false, events };
  }

  const confusionIndex = pokemon.volatileStatuses.findIndex((v) => v.id === "confusion");
  if (confusionIndex !== -1) {
    const volatile = pokemon.volatileStatuses[confusionIndex];
    const remaining = (volatile.turnsRemaining ?? 1) - 1;
    if (remaining <= 0) {
      pokemon.volatileStatuses.splice(confusionIndex, 1);
    } else {
      volatile.turnsRemaining = remaining;
      if (rng.chance(CONFUSION_SELF_HIT_CHANCE)) {
        const damage = confusionSelfDamage(pokemon);
        pokemon.currentHp = Math.max(0, pokemon.currentHp - damage);
        events.push({
          type: "secondary-damage",
          side,
          pokemonId: pokemon.id,
          amount: damage,
          remainingHp: pokemon.currentHp,
          cause: "confusion",
        });
        if (pokemon.currentHp === 0) {
          pokemon.fainted = true;
          events.push({ type: "fainted", side, pokemonId: pokemon.id });
        }
        events.push({ type: "move-prevented", side, pokemonId: pokemon.id, reason: "confusion" });
        return { canAct: false, events };
      }
    }
  }

  if (pokemon.status.condition === "paralysis" && rng.chance(FULL_PARALYSIS_CHANCE)) {
    events.push({ type: "move-prevented", side, pokemonId: pokemon.id, reason: "paralysis" });
    return { canAct: false, events };
  }

  return { canAct: true, events };
}

// ---------------------------------------------------------------------------
// End-of-turn processing: weather chip damage, terrain healing, status damage,
// ability/item weather hooks. Only the active (non-fainted) Pokémon on each side tick.
// ---------------------------------------------------------------------------

export function applySecondaryDamage(
  pokemon: Pokemon,
  side: BattleSideId,
  events: BattleEvent[],
  fraction: number,
  cause: Extract<BattleEvent, { type: "secondary-damage" }>["cause"]
): void {
  if (pokemon.fainted) return;
  const amount = Math.max(1, Math.floor(pokemon.stats.hp * fraction));
  pokemon.currentHp = Math.max(0, pokemon.currentHp - amount);
  events.push({ type: "secondary-damage", side, pokemonId: pokemon.id, amount, remainingHp: pokemon.currentHp, cause });
  if (pokemon.currentHp === 0) {
    pokemon.fainted = true;
    events.push({ type: "fainted", side, pokemonId: pokemon.id });
  }
}

export function applyHeal(
  pokemon: Pokemon,
  side: BattleSideId,
  events: BattleEvent[],
  fraction: number,
  cause: Extract<BattleEvent, { type: "heal" }>["cause"]
): void {
  if (pokemon.fainted) return;
  const amount = Math.min(pokemon.stats.hp - pokemon.currentHp, Math.max(1, Math.floor(pokemon.stats.hp * fraction)));
  if (amount <= 0) return;
  pokemon.currentHp += amount;
  events.push({ type: "heal", side, pokemonId: pokemon.id, amount, remainingHp: pokemon.currentHp, cause });
}

function processPokemonEndOfTurn(pokemon: Pokemon, side: BattleSideId, state: BattleState): BattleEvent[] {
  const events: BattleEvent[] = [];
  const types = getPokemonTypes(pokemon);

  const weatherDamageFraction = getWeatherDamageFraction(state.weather.id, types);
  if (weatherDamageFraction > 0) {
    applySecondaryDamage(pokemon, side, events, weatherDamageFraction, state.weather.id === "sandstorm" ? "sandstorm" : "hail");
  }

  if (state.terrain.id === "grassy") {
    applyHeal(pokemon, side, events, 1 / 16, "grassy-terrain");
  }

  if (pokemon.status.condition === "burn") {
    applySecondaryDamage(pokemon, side, events, 1 / 16, "burn");
  } else if (pokemon.status.condition === "poison") {
    applySecondaryDamage(pokemon, side, events, 1 / 8, "poison");
  } else if (pokemon.status.condition === "badly-poisoned") {
    const stage = pokemon.status.counter ?? 1;
    applySecondaryDamage(pokemon, side, events, stage / 16, "badly-poisoned");
    if (!pokemon.fainted) pokemon.status.counter = stage + 1;
  }

  const abilityHealFraction = getWeatherEndOfTurnHealFraction(pokemon, state.weather.id);
  if (abilityHealFraction > 0) applyHeal(pokemon, side, events, abilityHealFraction, "rain-dish");

  const abilityDamageFraction = getWeatherEndOfTurnDamageFraction(pokemon, state.weather.id);
  if (abilityDamageFraction > 0) applySecondaryDamage(pokemon, side, events, abilityDamageFraction, "solar-power");

  const itemHealFraction = getItemEndOfTurnHealFraction(pokemon);
  if (itemHealFraction > 0) applyHeal(pokemon, side, events, itemHealFraction, "leftovers");

  return events;
}

/** Runs weather/terrain ticking plus every active Pokémon's end-of-turn effects. */
export function processEndOfTurn(state: BattleState): BattleEvent[] {
  const events: BattleEvent[] = [...tickWeatherAndTerrain(state)];

  for (const sideId of ["player", "opponent"] as const) {
    const side = state.sides[sideId];
    const active = side.team[side.activePokemonIndex];
    if (active.fainted) continue;
    events.push(...processPokemonEndOfTurn(active, sideId, state));
  }

  return events;
}

// ---------------------------------------------------------------------------
// Hazards — applied whenever a Pokémon switches in (voluntary or forced).
// ---------------------------------------------------------------------------

function isGrounded(pokemon: Pokemon): boolean {
  const types = getPokemonTypes(pokemon);
  if (types.includes("Flying")) return false;
  return findAbility(pokemon.ability)?.id !== "levitate";
}

const SPIKES_DAMAGE_FRACTION = [0, 1 / 8, 1 / 6, 1 / 4];

export function applyHazardsOnSwitchIn(
  side: BattleSide,
  sideId: BattleSideId,
  pokemon: Pokemon,
  rng: RNG
): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (pokemon.fainted) return events;

  if (side.hazards.stealthRock) {
    const rockEffectiveness = getTypeMultiplier("Rock", getPokemonTypes(pokemon));
    const fraction = Math.min(0.5, 0.125 * rockEffectiveness);
    if (fraction > 0) applySecondaryDamage(pokemon, sideId, events, fraction, "stealth-rock");
  }

  const grounded = isGrounded(pokemon);

  if (!pokemon.fainted && grounded && side.hazards.spikes > 0) {
    applySecondaryDamage(pokemon, sideId, events, SPIKES_DAMAGE_FRACTION[side.hazards.spikes], "spikes");
  }

  if (!pokemon.fainted && grounded && side.hazards.toxicSpikes > 0) {
    const status: NonVolatileStatus = side.hazards.toxicSpikes >= 2 ? "badly-poisoned" : "poison";
    if (applyStatus(pokemon, status, "none", rng)) {
      events.push({ type: "status-applied", side: sideId, pokemonId: pokemon.id, status });
    }
  }

  if (!pokemon.fainted && grounded && side.hazards.stickyWeb) {
    pokemon.statStages.speed = Math.max(-6, pokemon.statStages.speed - 1);
    events.push({
      type: "stat-change",
      side: sideId,
      pokemonId: pokemon.id,
      stat: "speed",
      stages: -1,
      newStage: pokemon.statStages.speed,
    });
  }

  return events;
}
