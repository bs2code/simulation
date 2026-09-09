import { BattleAI } from "@/ai/BattleAI";
import { BattleEngine } from "@/engine/BattleEngine";
import type { BattleState } from "@/types/battle";
import type { Pokemon } from "@/types/pokemon";
import type { BattleReplay } from "@/types/replay";
import { SeededRNG } from "@/utils/rng";
import { computeBattleStats } from "./computeBattleStats";
import type { SimulationOptions, SimulationResult } from "./types";

const MAX_TURN_ITERATIONS = 500;

/**
 * Plays one full battle with AI controlling both sides, from team-preview to a winner (or the
 * iteration cap, treated as a draw). Fully deterministic given the same teams + seed + options —
 * this is the `simulateBattle(teamA, teamB, seed)` the RNG design was built for: rerunning it
 * reproduces the exact same battle, which is what makes `recordReplay` optional rather than
 * something every simulation has to pay for.
 */
export function simulateBattle(
  playerTeam: Pokemon[],
  opponentTeam: Pokemon[],
  seed: number,
  options: SimulationOptions
): { result: SimulationResult; replay?: BattleReplay } {
  const rng = new SeededRNG(seed);
  const engine = new BattleEngine(rng);
  const playerAI = new BattleAI(options.playerDifficulty, rng);
  const opponentAI = new BattleAI(options.opponentDifficulty, rng);

  let state: BattleState = engine.createBattle(playerTeam, opponentTeam, options.rules);
  const initialState = state;
  const snapshots: BattleState[] = [];
  let iterations = 0;

  while (state.phase !== "ended" && iterations < MAX_TURN_ITERATIONS) {
    iterations++;

    if (state.phase === "switching") {
      for (const side of engine.getSidesNeedingSwitch(state)) {
        const ai = side === "player" ? playerAI : opponentAI;
        const replacementId = ai.chooseSwitchReplacement(state, side);
        state = engine.resolveForcedSwitch(state, side, replacementId);
        if (options.recordReplay) snapshots.push(state);
      }
      continue;
    }

    const playerAction = playerAI.chooseAction(state, "player");
    const opponentAction = opponentAI.chooseAction(state, "opponent");
    state = engine.submitTurn(state, playerAction, opponentAction);
    if (options.recordReplay) snapshots.push(state);
  }

  const stats = computeBattleStats(state);
  const result: SimulationResult = {
    seed,
    winner: state.winner,
    turns: state.turn,
    remainingPlayerCount: state.sides.player.team.filter((p) => !p.fainted).length,
    remainingOpponentCount: state.sides.opponent.team.filter((p) => !p.fainted).length,
    totalDamageDealtBySide: stats.totalDamageDealtBySide,
    mvpPokemonId: stats.mvpPokemonId,
  };

  const replay: BattleReplay | undefined = options.recordReplay
    ? { id: `replay-${seed}-${Date.now()}`, createdAt: Date.now(), initialState, snapshots, winner: state.winner }
    : undefined;

  return { result, replay };
}
