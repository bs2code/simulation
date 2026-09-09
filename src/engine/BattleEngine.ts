import {
  createBattleSide,
  createDefaultFieldState,
  type BattleAction,
  type BattleSideId,
  type BattleState,
} from "@/types/battle";
import type { Pokemon } from "@/types/pokemon";
import { STANDARD_RULES, type BattleRules } from "@/types/rules";
import type { RNG } from "@/utils/rng";
import { DamageEngine } from "./DamageEngine";
import { getSidesNeedingForcedSwitch } from "./SwitchEngine";
import { TurnEngine } from "./TurnEngine";

/**
 * Public entry point for driving a battle. Owns BattleState creation and delegates the
 * actual turn/switch mechanics to TurnEngine + SwitchEngine, so callers (tests, AI, UI)
 * have one small surface to talk to instead of reaching into engine internals.
 */
export class BattleEngine {
  private readonly turnEngine: TurnEngine;

  constructor(rng: RNG, damageEngine: DamageEngine = new DamageEngine(rng)) {
    this.turnEngine = new TurnEngine(damageEngine, rng);
  }

  createBattle(playerTeam: Pokemon[], opponentTeam: Pokemon[], rules: BattleRules = STANDARD_RULES): BattleState {
    if (playerTeam.length === 0 || opponentTeam.length === 0) {
      throw new Error("Both teams must have at least one Pokémon");
    }
    return {
      turn: 1,
      phase: "choosing",
      weather: { id: "none", turnsRemaining: 0 },
      terrain: { id: "none", turnsRemaining: 0 },
      rules,
      sides: {
        player: createBattleSide(playerTeam),
        opponent: createBattleSide(opponentTeam),
      },
      field: createDefaultFieldState(),
      log: [],
    };
  }

  submitTurn(state: BattleState, playerAction: BattleAction, opponentAction: BattleAction): BattleState {
    return this.turnEngine.resolveTurn(state, playerAction, opponentAction);
  }

  resolveForcedSwitch(state: BattleState, side: BattleSideId, pokemonId: string): BattleState {
    return this.turnEngine.resolveForcedSwitch(state, side, pokemonId);
  }

  getSidesNeedingSwitch(state: BattleState): BattleSideId[] {
    return getSidesNeedingForcedSwitch(state);
  }

  isBattleOver(state: BattleState): boolean {
    return state.phase === "ended";
  }
}
