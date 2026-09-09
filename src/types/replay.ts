import type { BattleSideId, BattleState } from "./battle";

/**
 * A replayable record of a completed battle. `snapshots` is turn-granular (one entry per
 * resolveTurn/resolveForcedSwitch call) rather than per-event — the UI slices each snapshot's
 * `log` against the previous one to narrate what happened within that step. Because the engine
 * is deterministic given a seed, a replay can also just be re-simulated from `initialState` +
 * the same seed instead of being stored, which is how the simulation batch feature avoids
 * keeping full snapshots for every run.
 */
export type BattleReplay = {
  id: string;
  createdAt: number;
  initialState: BattleState;
  snapshots: BattleState[];
  winner?: BattleSideId;
};
