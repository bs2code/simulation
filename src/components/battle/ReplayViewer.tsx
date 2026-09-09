"use client";

import { useState } from "react";
import { BattleLogPanel } from "./BattleLogPanel";
import { PokemonStatusCard } from "@/components/PokemonStatusCard";
import { narrateEvents } from "@/lib/narrateEvent";
import type { BattleState } from "@/types/battle";

/** Steps through a completed (or in-progress) battle's turn-by-turn snapshots. */
export function ReplayViewer({ snapshots, onExit }: { snapshots: BattleState[]; onExit?: () => void }) {
  const [index, setIndex] = useState(0);
  const state = snapshots[Math.min(index, snapshots.length - 1)];
  const playerActive = state.sides.player.team[state.sides.player.activePokemonIndex];
  const opponentActive = state.sides.opponent.team[state.sides.opponent.activePokemonIndex];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <PokemonStatusCard pokemon={opponentActive} align="left" />
        <PokemonStatusCard pokemon={playerActive} align="right" />
      </div>

      <BattleLogPanel lines={narrateEvents(state.log, state)} />

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="rounded border-2 border-panel-muted px-3 py-1.5 text-sm disabled:opacity-30"
        >
          Prev
        </button>
        <span className="text-sm text-ink-muted">
          Turn {state.turn} · step {index + 1}/{snapshots.length}
        </span>
        <button
          type="button"
          disabled={index >= snapshots.length - 1}
          onClick={() => setIndex((i) => Math.min(snapshots.length - 1, i + 1))}
          className="rounded border-2 border-panel-muted px-3 py-1.5 text-sm disabled:opacity-30"
        >
          Next
        </button>
        {onExit && (
          <button type="button" onClick={onExit} className="ml-2 text-sm text-gold underline">
            Return to live
          </button>
        )}
      </div>
    </div>
  );
}
