import type { AIDifficulty } from "@/ai/BattleAI";
import type { BattleSideId } from "@/types/battle";
import type { BattleRules } from "@/types/rules";

export type SimulationOptions = {
  rules?: BattleRules;
  playerDifficulty: AIDifficulty;
  opponentDifficulty: AIDifficulty;
  /** Records a full turn-by-turn BattleReplay alongside the summary. Off by default for batches. */
  recordReplay?: boolean;
};

export type SimulationResult = {
  seed: number;
  winner?: BattleSideId;
  turns: number;
  remainingPlayerCount: number;
  remainingOpponentCount: number;
  totalDamageDealtBySide: Record<BattleSideId, number>;
  mvpPokemonId?: string;
};
