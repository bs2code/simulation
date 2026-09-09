import { getTypeMultiplier } from "@/data/types/typeChart";
import type { RNG } from "@/utils/rng";
import { getAccuracyStageMultiplier, getStatStageMultiplier } from "@/utils/statCalculator";
import { getPokemonTypes } from "@/utils/pokemonTypes";
import type { DamageContext, DamageResult } from "@/types/battle";
import type { Move } from "@/types/moves";
import type { Pokemon } from "@/types/pokemon";
import {
  getAbilityTypeImmunities,
  getLowHpStabMultiplier,
  getWeatherStatMultiplier,
} from "./AbilityEngine";
import { getItemDamageMultiplier, getItemTypePowerBoost } from "./ItemEngine";
import { getTerrainMultiplier, getWeatherMultiplier } from "./WeatherEngine";

const BASE_CRITICAL_HIT_CHANCE = 1 / 24;
const CRITICAL_HIT_MULTIPLIER = 1.5;
const STAB_MULTIPLIER = 1.5;
const SPREAD_MOVE_MULTIPLIER = 0.75;
const MIN_RANDOM_ROLL = 85;
const MAX_RANDOM_ROLL = 100;

/**
 * Resolves an attacker's offensive stat for this move's category, applying stat stages.
 * On a critical hit, negative attacker stages are ignored (never hurt the attacker).
 * A burned attacker has its physical Attack halved (classic in-game burn penalty).
 */
function getOffensiveStat(attacker: Pokemon, move: Move, isCritical: boolean): number {
  const isPhysical = move.category === "physical";
  const base = isPhysical ? attacker.stats.attack : attacker.stats.specialAttack;
  const stage = isPhysical ? attacker.statStages.attack : attacker.statStages.specialAttack;
  const effectiveStage = isCritical ? Math.max(0, stage) : stage;
  const stat = Math.floor(base * getStatStageMultiplier(effectiveStage));
  const burnPenalty = isPhysical && attacker.status.condition === "burn" ? 0.5 : 1;
  return Math.floor(stat * burnPenalty);
}

/**
 * Resolves a defender's defensive stat for this move's category, applying stat stages.
 * On a critical hit, positive defender stages are ignored (never help the defender).
 */
function getDefensiveStat(defender: Pokemon, move: Move, isCritical: boolean): number {
  const isPhysical = move.category === "physical";
  const base = isPhysical ? defender.stats.defense : defender.stats.specialDefense;
  const stage = isPhysical ? defender.statStages.defense : defender.statStages.specialDefense;
  const effectiveStage = isCritical ? Math.min(0, stage) : stage;
  return Math.floor(base * getStatStageMultiplier(effectiveStage));
}

/**
 * Calculates the damage a single use of `move` by `attacker` deals to `defender`.
 * Pure function of its inputs plus the supplied RNG — no battle state is read or mutated,
 * so it can be unit-tested and reused (AI evaluation, UI previews) independently of a live battle.
 */
export class DamageEngine {
  constructor(private readonly rng: RNG) {}

  /**
   * Rolls whether `move` hits, combining the move's base accuracy with the attacker's
   * accuracy stage and the defender's evasion stage. Moves with no `accuracy` field
   * (e.g. Swords Dance, Aerial Ace) never miss.
   */
  checkHit(attacker: Pokemon, defender: Pokemon, move: Move): boolean {
    if (move.accuracy === undefined) return true;
    const accuracyMultiplier = getAccuracyStageMultiplier(attacker.statStages.accuracy);
    const evasionMultiplier = getAccuracyStageMultiplier(defender.statStages.evasion);
    const chance = (move.accuracy / 100) * (accuracyMultiplier / evasionMultiplier);
    return this.rng.chance(Math.max(0, Math.min(1, chance)));
  }

  calculateDamage(
    attacker: Pokemon,
    defender: Pokemon,
    move: Move,
    context: DamageContext = {}
  ): DamageResult {
    if (move.category === "status" || !move.power) {
      return {
        damage: 0,
        critical: false,
        effectiveness: 1,
        randomModifier: 1,
        boostedByWeather: false,
        resisted: false,
        superEffective: false,
        stab: false,
        immune: false,
      };
    }

    const defenderTypes = getPokemonTypes(defender);
    const attackerTypes = getPokemonTypes(attacker);
    const typeChartEffectiveness = getTypeMultiplier(move.type, defenderTypes);
    const abilityImmune = getAbilityTypeImmunities(defender).includes(move.type);
    const effectiveness = abilityImmune ? 0 : typeChartEffectiveness;
    const immune = effectiveness === 0;

    if (immune) {
      return {
        damage: 0,
        critical: false,
        effectiveness,
        randomModifier: 1,
        boostedByWeather: false,
        resisted: false,
        superEffective: false,
        stab: attackerTypes.includes(move.type),
        immune: true,
      };
    }

    const critical = context.forceCritical ?? this.rng.chance(BASE_CRITICAL_HIT_CHANCE);
    const weather = context.weather ?? "none";
    const terrain = context.terrain ?? "none";

    const specialAttackAbilityMultiplier =
      move.category === "special" ? getWeatherStatMultiplier(attacker, weather, "specialAttack") : 1;
    const offensiveStat = Math.floor(
      getOffensiveStat(attacker, move, critical) * specialAttackAbilityMultiplier
    );
    const defensiveStat = getDefensiveStat(defender, move, critical);

    const baseDamage =
      Math.floor(
        (Math.floor((2 * attacker.level) / 5 + 2) * move.power * (offensiveStat / defensiveStat)) / 50
      ) + 2;

    const stab = attackerTypes.includes(move.type);
    const weatherMultiplier = getWeatherMultiplier(move.type, weather);
    const terrainMultiplier = getTerrainMultiplier(move.type, terrain);
    const boostedByWeather = weatherMultiplier > 1;
    const spreadMultiplier = context.isSpreadMove ? SPREAD_MOVE_MULTIPLIER : 1;
    const randomRoll = context.forceRandomRoll ?? this.rng.integer(MIN_RANDOM_ROLL, MAX_RANDOM_ROLL);
    const randomModifier = randomRoll / 100;
    const abilityStabBoost = getLowHpStabMultiplier(attacker, move.type);
    const itemMultiplier = getItemDamageMultiplier(attacker) * getItemTypePowerBoost(attacker, move.type);

    let damage = baseDamage;
    damage = Math.floor(damage * spreadMultiplier);
    damage = Math.floor(damage * weatherMultiplier);
    damage = Math.floor(damage * terrainMultiplier);
    damage = Math.floor(damage * (critical ? CRITICAL_HIT_MULTIPLIER : 1));
    damage = Math.floor(damage * randomModifier);
    damage = Math.floor(damage * (stab ? STAB_MULTIPLIER : 1));
    damage = Math.floor(damage * effectiveness);
    damage = Math.floor(damage * abilityStabBoost);
    damage = Math.floor(damage * itemMultiplier);
    damage = Math.max(1, damage);

    return {
      damage,
      critical,
      effectiveness,
      randomModifier,
      boostedByWeather,
      resisted: effectiveness < 1,
      superEffective: effectiveness > 1,
      stab,
      immune: false,
    };
  }
}
