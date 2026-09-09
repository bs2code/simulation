import type { Pokemon } from "@/types/pokemon";
import { simulateBattle } from "./simulateBattle";
import type { SimulationOptions, SimulationResult } from "./types";

export type SimulationBatchSummary = {
  results: SimulationResult[];
  playerWinRate: number;
  opponentWinRate: number;
  drawRate: number;
  averageTurns: number;
  averageSurvivorsPlayer: number;
  averageSurvivorsOpponent: number;
  /** The Pokémon that was MVP most often across the batch. */
  mvpPokemonId?: string;
};

/**
 * Runs `count` independent simulations (seeds `baseSeed..baseSeed+count-1`) and aggregates them.
 * Replays aren't recorded here — since simulateBattle is deterministic, viewing "the replay for
 * run N" just means re-running it with recordReplay:true and that same seed on demand.
 */
export function runSimulationBatch(
  playerTeam: Pokemon[],
  opponentTeam: Pokemon[],
  baseSeed: number,
  count: number,
  options: SimulationOptions
): SimulationBatchSummary {
  const results: SimulationResult[] = [];
  const mvpCounts: Record<string, number> = {};

  for (let i = 0; i < count; i++) {
    const { result } = simulateBattle(playerTeam, opponentTeam, baseSeed + i, {
      ...options,
      recordReplay: false,
    });
    results.push(result);
    if (result.mvpPokemonId) {
      mvpCounts[result.mvpPokemonId] = (mvpCounts[result.mvpPokemonId] ?? 0) + 1;
    }
  }

  const playerWins = results.filter((r) => r.winner === "player").length;
  const opponentWins = results.filter((r) => r.winner === "opponent").length;
  const draws = results.length - playerWins - opponentWins;

  let mvpPokemonId: string | undefined;
  let bestCount = -1;
  for (const [pokemonId, count] of Object.entries(mvpCounts)) {
    if (count > bestCount) {
      bestCount = count;
      mvpPokemonId = pokemonId;
    }
  }

  const total = results.length;
  return {
    results,
    playerWinRate: playerWins / total,
    opponentWinRate: opponentWins / total,
    drawRate: draws / total,
    averageTurns: results.reduce((sum, r) => sum + r.turns, 0) / total,
    averageSurvivorsPlayer: results.reduce((sum, r) => sum + r.remainingPlayerCount, 0) / total,
    averageSurvivorsOpponent: results.reduce((sum, r) => sum + r.remainingOpponentCount, 0) / total,
    mvpPokemonId,
  };
}
