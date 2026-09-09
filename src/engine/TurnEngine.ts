import { getMove } from "@/data/moves";
import {
  otherSide,
  type BattleAction,
  type BattleEvent,
  type BattleSideId,
  type BattleState,
  type Hazards,
  type HazardId,
  type MoveAction,
  type SecondaryDamageCause,
  type SwitchAction,
} from "@/types/battle";
import type { Move } from "@/types/moves";
import type { Pokemon, StatStages } from "@/types/pokemon";
import { getWeatherStatMultiplier, getContactStatusChances } from "./AbilityEngine";
import type { DamageEngine } from "./DamageEngine";
import {
  addConfusion,
  addVolatileStatus,
  applyHazardsOnSwitchIn,
  applyHeal,
  applyStatus,
  checkCanAct,
  processEndOfTurn,
} from "./EffectEngine";
import { getItemRecoilAfterAttackFraction, hasSurviveLethalHit } from "./ItemEngine";
import {
  activateMechanic,
  activateZMove,
  canActivateMechanic,
  getZMoveVariant,
  tickMechanicDurations,
  tryAutoActivateBattleBond,
} from "./MechanicsEngine";
import {
  findTeamIndexByPokemonId,
  getSidesNeedingForcedSwitch,
  hasSideLost,
  isValidSwitchTarget,
  performSwitch,
} from "./SwitchEngine";
import { setTerrain, setWeather } from "./WeatherEngine";
import type { RNG } from "@/utils/rng";
import { applyStatStage } from "@/utils/statCalculator";

/** Struggle isn't a learned move — it's only legal when every real move is out of PP. */
const STRUGGLE_MOVE_ID = "struggle";

type Mover = {
  side: BattleSideId;
  pokemon: Pokemon;
  move: Move;
};

/**
 * Resolves one full turn: validates both sides' chosen actions, performs any switches,
 * orders and executes move actions (including status checks, secondary effects, weather/
 * terrain/hazards, and ability/item hooks), runs end-of-turn effects, applies fainting, and
 * figures out whether the battle ended or a forced switch is now required. Always returns a
 * new BattleState — the input state (and the Pokémon/side objects inside it) is never mutated.
 */
export class TurnEngine {
  constructor(
    private readonly damageEngine: DamageEngine,
    private readonly rng: RNG
  ) {}

  resolveTurn(state: BattleState, playerAction: BattleAction, opponentAction: BattleAction): BattleState {
    if (state.phase !== "choosing") {
      throw new Error(`Cannot resolve a turn while battle phase is "${state.phase}"`);
    }

    const next = structuredClone(state);
    next.phase = "executing";
    const events: BattleEvent[] = [{ type: "turn-start", turn: next.turn }];

    this.validateAction(next, "player", playerAction);
    this.validateAction(next, "opponent", opponentAction);

    // Switches resolve before any move this turn; a side that switches doesn't also move.
    for (const [sideId, action] of [
      ["player", playerAction],
      ["opponent", opponentAction],
    ] as const) {
      if (action.type === "switch") {
        events.push(...this.executeSwitch(next, sideId, action));
      }
    }

    // Mega Evolution/Gigantamax/Battle Bond activate before speed is locked in for the turn
    // (a Mega Evolution's new Speed stat applies to this turn's move order); Z-Moves don't
    // affect ordering but are activated here too for consistency.
    events.push(...this.activateMechanics(next, playerAction, opponentAction));

    const movers = this.buildMoveOrder(
      next,
      playerAction.type === "move" ? playerAction : undefined,
      opponentAction.type === "move" ? opponentAction : undefined
    );

    for (const mover of movers) {
      events.push(...this.executeMove(next, mover));
    }

    events.push(...processEndOfTurn(next));
    events.push(...tickMechanicDurations(next));
    events.push({ type: "turn-end", turn: next.turn });
    next.log.push(...events);
    return this.finalize(next);
  }

  /** Resolves a forced switch during the "switching" phase (e.g. after a Pokémon faints). */
  resolveForcedSwitch(state: BattleState, side: BattleSideId, pokemonId: string): BattleState {
    if (state.phase !== "switching") {
      throw new Error(`Cannot force-switch while battle phase is "${state.phase}"`);
    }
    const stillNeeded = getSidesNeedingForcedSwitch(state);
    if (!stillNeeded.includes(side)) {
      throw new Error(`Side "${side}" does not currently need a forced switch`);
    }

    const next = structuredClone(state);
    const events = this.executeSwitch(next, side, { type: "switch", pokemonId });
    next.log.push(...events);
    return this.finalize(next);
  }

  private validateAction(state: BattleState, sideId: BattleSideId, action: BattleAction): void {
    const side = state.sides[sideId];
    const active = side.team[side.activePokemonIndex];

    if (action.type === "switch") {
      const targetIndex = findTeamIndexByPokemonId(side, action.pokemonId);
      if (!isValidSwitchTarget(side, targetIndex)) {
        throw new Error(`Invalid switch target "${action.pokemonId}" for side "${sideId}"`);
      }
      return;
    }

    if (action.type === "move") {
      if (active.fainted) {
        throw new Error(`Side "${sideId}" cannot use a move: active Pokémon has fainted`);
      }
      if (action.pokemonId !== active.id) {
        throw new Error(
          `Side "${sideId}" submitted a move for "${action.pokemonId}" but the active Pokémon is "${active.id}"`
        );
      }
      if (action.moveId === STRUGGLE_MOVE_ID) {
        const allOutOfPP = active.moves.every((m) => m.currentPP <= 0);
        if (!allOutOfPP) {
          throw new Error(`"${active.id}" cannot use Struggle while it still has a usable move`);
        }
      } else {
        const battleMove = active.moves.find((m) => m.moveId === action.moveId);
        if (!battleMove) {
          throw new Error(`"${active.id}" does not know move "${action.moveId}"`);
        }
        if (battleMove.currentPP <= 0) {
          throw new Error(`"${active.id}" has no PP left for "${action.moveId}"`);
        }
      }
      if (action.mechanic) {
        const check = canActivateMechanic(active, side, action.mechanic, state.rules);
        if (!check.ok) {
          throw new Error(`Cannot activate ${action.mechanic} for "${active.id}": ${check.reason}`);
        }
      }
      return;
    }

    throw new Error(`Standalone mechanic actions aren't supported — activate via MoveAction.mechanic ("${sideId}")`);
  }

  /** Activates any mechanic (mega/gigantamax/battle-bond/z-move) chosen for this turn's move actions. */
  private activateMechanics(state: BattleState, playerAction: BattleAction, opponentAction: BattleAction): BattleEvent[] {
    const events: BattleEvent[] = [];
    for (const [sideId, action] of [
      ["player", playerAction],
      ["opponent", opponentAction],
    ] as const) {
      if (action.type !== "move" || !action.mechanic) continue;
      const side = state.sides[sideId];
      const pokemon = side.team[side.activePokemonIndex];

      if (action.mechanic === "z-move") {
        activateZMove(pokemon, side);
        events.push({ type: "z-move-used", side: sideId, pokemonId: pokemon.id, moveId: action.moveId });
      } else {
        events.push(activateMechanic(pokemon, side, sideId, action.mechanic));
      }
    }
    return events;
  }

  private executeSwitch(state: BattleState, sideId: BattleSideId, action: SwitchAction): BattleEvent[] {
    const side = state.sides[sideId];
    const targetIndex = findTeamIndexByPokemonId(side, action.pokemonId);
    const events = performSwitch(side, sideId, targetIndex);
    const incoming = side.team[targetIndex];
    events.push(...applyHazardsOnSwitchIn(side, sideId, incoming, this.rng));
    return events;
  }

  private buildMoveOrder(
    state: BattleState,
    playerAction: MoveAction | undefined,
    opponentAction: MoveAction | undefined
  ): Mover[] {
    const resolveMove = (action: MoveAction): Move => {
      const base = getMove(action.moveId);
      return action.mechanic === "z-move" ? getZMoveVariant(base) : base;
    };

    const movers: Mover[] = [];
    if (playerAction) {
      const pokemon = state.sides.player.team[state.sides.player.activePokemonIndex];
      movers.push({ side: "player", pokemon, move: resolveMove(playerAction) });
    }
    if (opponentAction) {
      const pokemon = state.sides.opponent.team[state.sides.opponent.activePokemonIndex];
      movers.push({ side: "opponent", pokemon, move: resolveMove(opponentAction) });
    }

    const effectiveSpeed = (pokemon: Pokemon): number => {
      let speed = applyStatStage(pokemon.stats.speed, pokemon.statStages.speed);
      speed = Math.floor(speed * getWeatherStatMultiplier(pokemon, state.weather.id, "speed"));
      if (pokemon.status.condition === "paralysis") speed = Math.floor(speed * 0.5);
      return speed;
    };

    return movers.sort((a, b) => {
      if (a.move.priority !== b.move.priority) return b.move.priority - a.move.priority;
      const speedDiff = effectiveSpeed(b.pokemon) - effectiveSpeed(a.pokemon);
      if (speedDiff !== 0) return speedDiff;
      return this.rng.chance(0.5) ? -1 : 1;
    });
  }

  private executeMove(state: BattleState, mover: Mover): BattleEvent[] {
    const events: BattleEvent[] = [];
    const { side, pokemon: attacker, move } = mover;
    const defenderSideId = otherSide(side);
    const defenderSide = state.sides[defenderSideId];
    const defender = defenderSide.team[defenderSide.activePokemonIndex];

    if (attacker.fainted) return events;

    const gate = checkCanAct(attacker, side, this.rng);
    events.push(...gate.events);
    if (!gate.canAct) return events;

    const battleMove = attacker.moves.find((m) => m.moveId === move.id);
    if (battleMove) battleMove.currentPP = Math.max(0, battleMove.currentPP - 1);

    events.push({ type: "move-used", side, pokemonId: attacker.id, moveId: move.id });

    if (defender.fainted) return events;

    if (!this.damageEngine.checkHit(attacker, defender, move)) {
      events.push({ type: "move-missed", side, pokemonId: attacker.id, moveId: move.id });
      return events;
    }

    let damageDealt = 0;

    if (move.category !== "status" && move.power) {
      const result = this.damageEngine.calculateDamage(attacker, defender, move, {
        weather: state.weather.id,
        terrain: state.terrain.id,
      });
      damageDealt = result.damage;
      const hpBeforeHit = defender.currentHp;
      let newHp = Math.max(0, defender.currentHp - result.damage);

      if (newHp === 0 && hpBeforeHit === defender.stats.hp && hasSurviveLethalHit(defender)) {
        newHp = 1;
        const consumedItemId = defender.item!;
        defender.item = undefined;
        events.push({ type: "item-consumed", side: defenderSideId, pokemonId: defender.id, itemId: consumedItemId });
      }

      defender.currentHp = newHp;
      events.push({
        type: "damage",
        side: defenderSideId,
        pokemonId: defender.id,
        amount: result.damage,
        remainingHp: defender.currentHp,
        result,
      });

      if (defender.currentHp === 0) {
        defender.fainted = true;
        events.push({ type: "fainted", side: defenderSideId, pokemonId: defender.id });
        const battleBondEvent = tryAutoActivateBattleBond(attacker, state.sides[side], side, state.rules);
        if (battleBondEvent) events.push(battleBondEvent);
      }

      if (move.flags.contact) {
        for (const { status, chance } of getContactStatusChances(defender)) {
          if (this.rng.chance(chance / 100) && applyStatus(attacker, status, state.terrain.id, this.rng)) {
            events.push({ type: "status-applied", side, pokemonId: attacker.id, status });
          }
        }
      }

      const itemRecoilFraction = getItemRecoilAfterAttackFraction(attacker);
      if (itemRecoilFraction > 0) {
        this.applyRawDamage(attacker, side, events, Math.max(1, Math.floor(attacker.stats.hp * itemRecoilFraction)), "life-orb");
      }
    }

    events.push(...this.applyMoveEffects(state, mover, defender, defenderSideId, damageDealt));
    return events;
  }

  private applyMoveEffects(
    state: BattleState,
    mover: Mover,
    defender: Pokemon,
    defenderSideId: BattleSideId,
    damageDealt: number
  ): BattleEvent[] {
    const events: BattleEvent[] = [];

    for (const effect of mover.move.effects) {
      const chance = "chance" in effect ? (effect.chance ?? 100) : 100;
      if (!this.rng.chance(chance / 100)) continue;

      switch (effect.kind) {
        case "stat-change": {
          const isSelf = effect.target === "self";
          const target = isSelf ? mover.pokemon : defender;
          const targetSide = isSelf ? mover.side : defenderSideId;
          if (!isSelf && target.fainted) break;

          const stat = effect.stat as keyof StatStages;
          const newStage = Math.max(-6, Math.min(6, target.statStages[stat] + effect.stages));
          target.statStages[stat] = newStage;
          events.push({ type: "stat-change", side: targetSide, pokemonId: target.id, stat, stages: effect.stages, newStage });
          break;
        }

        case "status": {
          const isSelf = effect.target === "self";
          const target = isSelf ? mover.pokemon : defender;
          const targetSide = isSelf ? mover.side : defenderSideId;
          if (!isSelf && target.fainted) break;
          if (applyStatus(target, effect.status, state.terrain.id, this.rng)) {
            events.push({ type: "status-applied", side: targetSide, pokemonId: target.id, status: effect.status });
          }
          break;
        }

        case "flinch": {
          if (!defender.fainted) addVolatileStatus(defender, "flinch");
          break;
        }

        case "volatile": {
          if (effect.volatile === "confusion") {
            const isSelf = effect.target === "self";
            const target = isSelf ? mover.pokemon : defender;
            if (!isSelf && target.fainted) break;
            addConfusion(target, this.rng);
          }
          break;
        }

        case "heal": {
          const isSelf = effect.target === "self";
          const target = isSelf ? mover.pokemon : defender;
          const targetSide = isSelf ? mover.side : defenderSideId;
          if (!isSelf && target.fainted) break;
          applyHeal(target, targetSide, events, effect.fraction, "move");
          break;
        }

        case "recoil": {
          if (mover.pokemon.fainted) break;
          if (effect.basis === "max-hp") {
            const amount = Math.max(1, Math.floor(mover.pokemon.stats.hp * effect.fraction));
            this.applyRawDamage(mover.pokemon, mover.side, events, amount, "recoil");
          } else if (damageDealt > 0) {
            const amount = Math.max(1, Math.floor(damageDealt * effect.fraction));
            this.applyRawDamage(mover.pokemon, mover.side, events, amount, "recoil");
          }
          break;
        }

        case "weather": {
          events.push(setWeather(state, effect.weather, effect.turns));
          break;
        }

        case "terrain": {
          events.push(setTerrain(state, effect.terrain, effect.turns));
          break;
        }

        case "hazard": {
          const targetSide = effect.target === "opponent-side" ? defenderSideId : mover.side;
          events.push(...this.applyHazardEffect(state.sides[targetSide].hazards, targetSide, effect.hazard));
          break;
        }

        case "multi-hit":
          // Multi-hit resolution isn't implemented yet; such moves currently hit once.
          break;
      }
    }

    return events;
  }

  private applyHazardEffect(hazards: Hazards, side: BattleSideId, hazard: HazardId): BattleEvent[] {
    switch (hazard) {
      case "stealth-rock":
        hazards.stealthRock = true;
        break;
      case "spikes":
        hazards.spikes = Math.min(3, hazards.spikes + 1);
        break;
      case "toxic-spikes":
        hazards.toxicSpikes = Math.min(2, hazards.toxicSpikes + 1);
        break;
      case "sticky-web":
        hazards.stickyWeb = true;
        break;
    }
    return [{ type: "hazard-set", side, hazard }];
  }

  private applyRawDamage(
    pokemon: Pokemon,
    side: BattleSideId,
    events: BattleEvent[],
    amount: number,
    cause: SecondaryDamageCause
  ): void {
    if (pokemon.fainted) return;
    pokemon.currentHp = Math.max(0, pokemon.currentHp - amount);
    events.push({ type: "secondary-damage", side, pokemonId: pokemon.id, amount, remainingHp: pokemon.currentHp, cause });
    if (pokemon.currentHp === 0) {
      pokemon.fainted = true;
      events.push({ type: "fainted", side, pokemonId: pokemon.id });
    }
  }

  /** Shared end-of-action bookkeeping: battle-end detection, forced-switch detection, phase/turn transition. */
  private finalize(state: BattleState): BattleState {
    const playerLost = hasSideLost(state.sides.player);
    const opponentLost = hasSideLost(state.sides.opponent);

    if (playerLost || opponentLost) {
      state.phase = "ended";
      state.winner = playerLost && opponentLost ? undefined : playerLost ? "opponent" : "player";
      state.log.push({ type: "battle-end", winner: state.winner });
      return state;
    }

    const needingSwitch = getSidesNeedingForcedSwitch(state);
    if (needingSwitch.length > 0) {
      state.phase = "switching";
      return state;
    }

    state.phase = "choosing";
    state.turn += 1;
    return state;
  }
}
