import { getSpecies } from "@/data/pokemon";
import type { BattleEvent, BattleSide, BattleSideId, BattleState } from "@/types/battle";
import type { BattleMechanic } from "@/types/mechanics";
import type { Move } from "@/types/moves";
import type { Pokemon, PokemonForm } from "@/types/pokemon";
import type { BattleRules } from "@/types/rules";
import { calculateStats } from "@/utils/statCalculator";

/**
 * Battle mechanics (Mega Evolution, Gigantamax, Battle Bond, Z-Moves) are opt-in per turn via
 * `MoveAction.mechanic` — a Pokémon having access to one never means it's used automatically
 * (the one exception being Battle Bond, which canonically triggers automatically on a KO; see
 * `tryAutoActivateBattleBond`). `canActivateMechanic` is the single gate everything else in the
 * engine defers to, so a custom ruleset changes behavior by editing BattleRules, not this file.
 */
export type MechanicCheckResult = { ok: true } | { ok: false; reason: string };

function findForm(pokemon: Pokemon, category: PokemonForm["formCategory"]): PokemonForm | undefined {
  return getSpecies(pokemon.speciesId).forms?.find((f) => f.formCategory === category);
}

/**
 * Finds the Mega form (if any) `pokemon` currently qualifies for. Most Megas are gated on a
 * held item (`requiredItem`); Rayquaza is the one exception, gated on knowing Dragon Ascent
 * (`requiredMove`) instead — see megaEvolutions.ts.
 */
function findAvailableMegaForm(pokemon: Pokemon): PokemonForm | undefined {
  const species = getSpecies(pokemon.speciesId);
  return species.forms?.find((f) => {
    if (f.formCategory !== "mega") return false;
    if (f.requiredMove) return pokemon.moves.some((m) => m.moveId === f.requiredMove);
    return f.requiredItem === pokemon.item;
  });
}

export function canActivateMechanic(
  pokemon: Pokemon,
  side: BattleSide,
  mechanic: BattleMechanic,
  rules: BattleRules
): MechanicCheckResult {
  if (pokemon.fainted) return { ok: false, reason: "Pokémon has fainted" };

  switch (mechanic) {
    case "mega": {
      if (!rules.allowMegaEvolution) return { ok: false, reason: "Mega Evolution is disabled by the ruleset" };
      if (side.mechanicUsage.mega >= rules.maxMegaUsesPerBattle) {
        return { ok: false, reason: "Mega Evolution has already been used the maximum number of times this battle" };
      }
      if (pokemon.mechanicState.megaEvolved) return { ok: false, reason: "This Pokémon has already Mega Evolved" };
      if (!findAvailableMegaForm(pokemon)) {
        return { ok: false, reason: "This Pokémon has no Mega Evolution available (needs the right held item, or for Rayquaza, to know Dragon Ascent)" };
      }
      return { ok: true };
    }

    case "gigantamax": {
      if (!rules.allowGigantamax) return { ok: false, reason: "Gigantamax is disabled by the ruleset" };
      if (side.mechanicUsage.gigantamax >= rules.maxGigantamaxUsesPerBattle) {
        return { ok: false, reason: "Gigantamax has already been used the maximum number of times this battle" };
      }
      if (pokemon.mechanicState.gigantamaxed) return { ok: false, reason: "This Pokémon is already Gigantamax" };
      if (!findForm(pokemon, "gigantamax")) return { ok: false, reason: "This Pokémon cannot Gigantamax" };
      return { ok: true };
    }

    case "z-move": {
      if (!rules.allowZMoves) return { ok: false, reason: "Z-Moves are disabled by the ruleset" };
      if (side.mechanicUsage.zMove >= rules.maxZMovesPerBattle) {
        return { ok: false, reason: "A Z-Move has already been used the maximum number of times this battle" };
      }
      if (pokemon.mechanicState.zMoveUsed) return { ok: false, reason: "This Pokémon has already used its Z-Move" };
      // Simplification: any Z-Crystal unlocks a Z-Move of the chosen move's type, rather than
      // modeling the real games' per-type/per-move crystal matching.
      if (pokemon.item !== "z-crystal") return { ok: false, reason: "This Pokémon isn't holding a Z-Crystal" };
      return { ok: true };
    }

    case "battle-bond": {
      if (!rules.allowBattleBond) return { ok: false, reason: "Battle Bond is disabled by the ruleset" };
      if (pokemon.ability !== "battle-bond") {
        return { ok: false, reason: "This Pokémon doesn't have the Battle Bond ability" };
      }
      if (pokemon.mechanicState.battleBondActivated) {
        return { ok: false, reason: "Battle Bond has already activated for this Pokémon" };
      }
      if (!findForm(pokemon, "battle-bond")) {
        return { ok: false, reason: "This Pokémon's species has no Battle Bond form" };
      }
      return { ok: true };
    }
  }
}

/** Recomputes stats for a new base-stat line while preserving current-HP percentage. */
function transformStats(pokemon: Pokemon, baseStats: PokemonForm["baseStats"], doubleHp: boolean): void {
  const hpRatio = pokemon.currentHp / pokemon.stats.hp;
  const newStats = calculateStats(baseStats, pokemon.level, pokemon.nature, pokemon.ivs, pokemon.evs);
  if (doubleHp) newStats.hp *= 2;
  pokemon.stats = newStats;
  pokemon.currentHp = Math.max(1, Math.round(newStats.hp * hpRatio));
}

/**
 * Activates a form-changing mechanic (mega/gigantamax/battle-bond). Assumes
 * `canActivateMechanic` already returned ok — this does not re-validate.
 * Z-Moves don't change form, so they're handled separately (see `activateZMove`).
 */
export function activateMechanic(
  pokemon: Pokemon,
  side: BattleSide,
  sideId: BattleSideId,
  mechanic: Exclude<BattleMechanic, "z-move">
): BattleEvent {
  if (mechanic === "mega") {
    const form = findAvailableMegaForm(pokemon)!;
    transformStats(pokemon, form.baseStats, false);
    pokemon.form = form.id;
    pokemon.mechanicState.megaEvolved = true;
    side.mechanicUsage.mega += 1;
    return { type: "form-change", side: sideId, pokemonId: pokemon.id, form: form.id, cause: "mega" };
  }

  if (mechanic === "gigantamax") {
    const form = findForm(pokemon, "gigantamax")!;
    transformStats(pokemon, form.baseStats, true);
    pokemon.form = form.id;
    pokemon.mechanicState.gigantamaxed = true;
    pokemon.mechanicState.dynamaxTurnsRemaining = 3;
    side.mechanicUsage.gigantamax += 1;
    return { type: "form-change", side: sideId, pokemonId: pokemon.id, form: form.id, cause: "gigantamax" };
  }

  // battle-bond
  const form = findForm(pokemon, "battle-bond")!;
  transformStats(pokemon, form.baseStats, false);
  pokemon.form = form.id;
  pokemon.mechanicState.battleBondActivated = true;
  return { type: "form-change", side: sideId, pokemonId: pokemon.id, form: form.id, cause: "battle-bond" };
}

/** Marks a Z-Move as used. Doesn't change form; the caller narrates the move itself. */
export function activateZMove(pokemon: Pokemon, side: BattleSide): void {
  pokemon.mechanicState.zMoveUsed = true;
  side.mechanicUsage.zMove += 1;
}

/**
 * Battle Bond activates automatically the first time its Greninja knocks out an opposing
 * Pokémon — it's the one mechanic in this engine a player doesn't choose to activate.
 */
export function tryAutoActivateBattleBond(
  pokemon: Pokemon,
  side: BattleSide,
  sideId: BattleSideId,
  rules: BattleRules
): BattleEvent | undefined {
  if (canActivateMechanic(pokemon, side, "battle-bond", rules).ok !== true) return undefined;
  return activateMechanic(pokemon, side, sideId, "battle-bond");
}

const MAX_Z_MOVE_POWER = 200;
const Z_MOVE_POWER_MULTIPLIER = 1.5;

/**
 * Returns the Z-Move version of `move` for a single use: damaging moves get a flat power
 * boost and never miss; status moves keep their normal effect (the accompanying stat boost
 * is applied by the caller, since it isn't a property of the move itself).
 */
export function getZMoveVariant(move: Move): Move {
  if (move.category === "status" || !move.power) return move;
  return {
    ...move,
    power: Math.min(MAX_Z_MOVE_POWER, Math.round(move.power * Z_MOVE_POWER_MULTIPLIER)),
    accuracy: undefined,
  };
}

/** Reverts a Gigantamax'd Pokémon back to its base form once its duration runs out. */
function revertForm(pokemon: Pokemon): void {
  const species = getSpecies(pokemon.speciesId);
  const hpRatio = pokemon.currentHp / pokemon.stats.hp;
  const newStats = calculateStats(species.baseStats, pokemon.level, pokemon.nature, pokemon.ivs, pokemon.evs);
  pokemon.stats = newStats;
  pokemon.currentHp = Math.max(0, Math.round(newStats.hp * hpRatio));
  pokemon.form = undefined;
}

/** Counts down Gigantamax duration for both sides' active Pokémon, reverting at zero. */
export function tickMechanicDurations(state: BattleState): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (const sideId of ["player", "opponent"] as const) {
    const side = state.sides[sideId];
    const pokemon = side.team[side.activePokemonIndex];
    if (pokemon.fainted || !pokemon.mechanicState.gigantamaxed) continue;

    pokemon.mechanicState.dynamaxTurnsRemaining -= 1;
    if (pokemon.mechanicState.dynamaxTurnsRemaining <= 0) {
      revertForm(pokemon);
      pokemon.mechanicState.gigantamaxed = false;
      events.push({ type: "form-change", side: sideId, pokemonId: pokemon.id, form: undefined, cause: "revert" });
    }
  }
  return events;
}
