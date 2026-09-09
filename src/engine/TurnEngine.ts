import { getMove } from "@/data/moves";
import type {
  BattleAction,
  BattleEvent,
  BattleSideId,
  BattleState,
  MoveAction,
  SwitchAction,
} from "@/types/battle";
import type { Move } from "@/types/moves";
import type { Pokemon, StatStages } from "@/types/pokemon";
import type { DamageEngine } from "./DamageEngine";
import {
  findTeamIndexByPokemonId,
  getSidesNeedingForcedSwitch,
  hasSideLost,
  isValidSwitchTarget,
  performSwitch,
} from "./SwitchEngine";
import type { RNG } from "@/utils/rng";
import { applyStatStage } from "@/utils/statCalculator";

const OTHER_SIDE: Record<BattleSideId, BattleSideId> = { player: "opponent", opponent: "player" };

type Mover = {
  side: BattleSideId;
  pokemon: Pokemon;
  move: Move;
};

/**
 * Resolves one full turn: validates both sides' chosen actions, performs any switches,
 * orders and executes move actions, applies fainting, and figures out whether the battle
 * ended or a forced switch is now required. Always returns a new BattleState — the input
 * state (and the Pokémon/side objects inside it) is never mutated.
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

    const movers = this.buildMoveOrder(
      next,
      playerAction.type === "move" ? playerAction : undefined,
      opponentAction.type === "move" ? opponentAction : undefined
    );

    for (const mover of movers) {
      events.push(...this.executeMove(next, mover));
    }

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
      const battleMove = active.moves.find((m) => m.moveId === action.moveId);
      if (!battleMove) {
        throw new Error(`"${active.id}" does not know move "${action.moveId}"`);
      }
      if (battleMove.currentPP <= 0) {
        throw new Error(`"${active.id}" has no PP left for "${action.moveId}"`);
      }
      return;
    }

    throw new Error(`Mechanic actions are not supported until Phase 4 ("${sideId}")`);
  }

  private executeSwitch(state: BattleState, sideId: BattleSideId, action: SwitchAction): BattleEvent[] {
    const side = state.sides[sideId];
    const targetIndex = findTeamIndexByPokemonId(side, action.pokemonId);
    return performSwitch(side, sideId, targetIndex);
  }

  private buildMoveOrder(
    state: BattleState,
    playerAction: MoveAction | undefined,
    opponentAction: MoveAction | undefined
  ): Mover[] {
    const movers: Mover[] = [];
    if (playerAction) {
      const pokemon = state.sides.player.team[state.sides.player.activePokemonIndex];
      movers.push({ side: "player", pokemon, move: getMove(playerAction.moveId) });
    }
    if (opponentAction) {
      const pokemon = state.sides.opponent.team[state.sides.opponent.activePokemonIndex];
      movers.push({ side: "opponent", pokemon, move: getMove(opponentAction.moveId) });
    }

    const effectiveSpeed = (pokemon: Pokemon): number =>
      applyStatStage(pokemon.stats.speed, pokemon.statStages.speed);

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
    const defenderSideId = OTHER_SIDE[side];
    const defenderSide = state.sides[defenderSideId];
    const defender = defenderSide.team[defenderSide.activePokemonIndex];

    if (attacker.fainted) return events;

    const battleMove = attacker.moves.find((m) => m.moveId === move.id);
    if (battleMove) battleMove.currentPP = Math.max(0, battleMove.currentPP - 1);

    events.push({ type: "move-used", side, pokemonId: attacker.id, moveId: move.id });

    if (defender.fainted) return events;

    if (!this.damageEngine.checkHit(attacker, defender, move)) {
      events.push({ type: "move-missed", side, pokemonId: attacker.id, moveId: move.id });
      return events;
    }

    if (move.category !== "status" && move.power) {
      const result = this.damageEngine.calculateDamage(attacker, defender, move, {
        weather: state.weather.id,
        terrain: state.terrain.id,
      });
      defender.currentHp = Math.max(0, defender.currentHp - result.damage);
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
      }
    }

    events.push(...this.applyStatChangeEffects(state, mover, defender, defenderSideId));
    return events;
  }

  private applyStatChangeEffects(
    state: BattleState,
    mover: Mover,
    defender: Pokemon,
    defenderSideId: BattleSideId
  ): BattleEvent[] {
    const events: BattleEvent[] = [];
    for (const effect of mover.move.effects) {
      if (effect.kind !== "stat-change") continue;
      const chance = effect.chance ?? 100;
      if (!this.rng.chance(chance / 100)) continue;

      const isSelf = effect.target === "self";
      const target = isSelf ? mover.pokemon : defender;
      const targetSide = isSelf ? mover.side : defenderSideId;
      if (!isSelf && target.fainted) continue;

      const stat = effect.stat as keyof StatStages;
      const currentStage = target.statStages[stat];
      const newStage = Math.max(-6, Math.min(6, currentStage + effect.stages));
      target.statStages[stat] = newStage;

      events.push({
        type: "stat-change",
        side: targetSide,
        pokemonId: target.id,
        stat,
        stages: effect.stages,
        newStage,
      });
    }
    return events;
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
