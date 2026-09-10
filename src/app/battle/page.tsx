"use client";

import { useState } from "react";
import { type AIDifficulty, BattleAI } from "@/ai/BattleAI";
import { BattleLogPanel } from "@/components/battle/BattleLogPanel";
import { MechanicToggleRow } from "@/components/battle/MechanicToggleRow";
import { MoveButtonGrid } from "@/components/battle/MoveButtonGrid";
import { ReplayViewer } from "@/components/battle/ReplayViewer";
import { SwitchPicker } from "@/components/battle/SwitchPicker";
import { PokemonStatusCard } from "@/components/PokemonStatusCard";
import { BattleEngine } from "@/engine/BattleEngine";
import { narrateEvents } from "@/lib/narrateEvent";
import { findPokemonInState, getDisplayName } from "@/lib/pokemonDisplay";
import { buildTeamFromSaved, isTeamComplete, useTeamSlot } from "@/lib/teamStorage";
import { computeBattleStats } from "@/simulation/computeBattleStats";
import type { BattleAction, BattleSideId, BattleState } from "@/types/battle";
import type { BattleMechanic } from "@/types/mechanics";
import { STANDARD_RULES } from "@/types/rules";
import { SeededRNG } from "@/utils/rng";
import Link from "next/link";

type Controller = { type: "human" } | { type: "ai"; difficulty: AIDifficulty };
const TEAM_SIZE = STANDARD_RULES.teamSize;

type Session = {
  engine: BattleEngine;
  ais: Partial<Record<BattleSideId, BattleAI>>;
  seed: number;
  state: BattleState;
  snapshots: BattleState[];
};

function ControllerPicker({ value, onChange, label }: { value: Controller; onChange: (c: Controller) => void; label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <select
        className="rounded border-2 border-panel-ink bg-white px-2 py-1.5 text-panel-ink"
        value={value.type === "human" ? "human" : value.difficulty}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "human" ? { type: "human" } : { type: "ai", difficulty: v as AIDifficulty });
        }}
      >
        <option value="human">Human</option>
        <option value="easy">AI — Easy</option>
        <option value="normal">AI — Normal</option>
        <option value="expert">AI — Expert</option>
      </select>
    </label>
  );
}

export default function BattlePage() {
  const teamA = useTeamSlot("A");
  const teamB = useTeamSlot("B");
  const [teamAController, setTeamAController] = useState<Controller>({ type: "human" });
  const [teamBController, setTeamBController] = useState<Controller>({ type: "ai", difficulty: "normal" });

  const [session, setSession] = useState<Session | null>(null);
  const [pendingChoices, setPendingChoices] = useState<Partial<Record<BattleSideId, BattleAction>>>({});
  // Per-side, not a single shared value — a human-vs-human battle has two independent mechanic
  // toggles. Sharing one here meant side B's "mega" toggle could still be set when side A
  // submitted, silently attaching mechanic: "mega" to a Pokémon that can't mega evolve — that
  // fails validation, submitTurn throws, and with nothing catching it the whole battle freezes
  // with both sides stuck showing "ready" forever.
  const [pendingMechanics, setPendingMechanics] = useState<Partial<Record<BattleSideId, BattleMechanic | undefined>>>({});
  const [voluntarySwitchFor, setVoluntarySwitchFor] = useState<BattleSideId | null>(null);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [turnError, setTurnError] = useState<string | null>(null);

  const controllerFor = (side: BattleSideId): Controller => (side === "player" ? teamAController : teamBController);

  function startBattle() {
    const seed = Date.now();
    const rng = new SeededRNG(seed);
    const engine = new BattleEngine(rng);
    const ais: Partial<Record<BattleSideId, BattleAI>> = {};
    if (teamAController.type === "ai") ais.player = new BattleAI(teamAController.difficulty, rng);
    if (teamBController.type === "ai") ais.opponent = new BattleAI(teamBController.difficulty, rng);
    const initial = engine.createBattle(buildTeamFromSaved("A", teamA.team), buildTeamFromSaved("B", teamB.team), STANDARD_RULES);
    setSession({ engine, ais, seed, state: initial, snapshots: [initial] });
    setPendingChoices({});
    setPendingMechanics({});
    setVoluntarySwitchFor(null);
    setReplayIndex(null);
    setTurnError(null);
  }

  /** Resolves any AI-controlled forced switch(es) synchronously, stopping if a human must choose. */
  function resolveAiForcedSwitches(session: Session, state: BattleState, snapshotsOut: BattleState[]): BattleState {
    let current = state;
    while (current.phase === "switching") {
      const aiSide = session.engine.getSidesNeedingSwitch(current).find((side) => controllerFor(side).type === "ai");
      if (!aiSide) break;
      const replacementId = session.ais[aiSide]!.chooseSwitchReplacement(current, aiSide);
      current = session.engine.resolveForcedSwitch(current, aiSide, replacementId);
      snapshotsOut.push(current);
    }
    return current;
  }

  function advance(newState: BattleState) {
    setSession((prev) => {
      if (!prev) return prev;
      const snapshots = [...prev.snapshots, newState];
      const finalState = resolveAiForcedSwitches(prev, newState, snapshots);
      return { ...prev, state: finalState, snapshots };
    });
  }

  function tryAdvanceTurn(choices: Partial<Record<BattleSideId, BattleAction>>) {
    if (!session || session.state.phase !== "choosing") return;
    const resolved: Partial<Record<BattleSideId, BattleAction>> = {};
    for (const side of ["player", "opponent"] as const) {
      const controller = controllerFor(side);
      if (controller.type === "ai") {
        resolved[side] = session.ais[side]!.chooseAction(session.state, side);
      } else {
        if (!choices[side]) return;
        resolved[side] = choices[side];
      }
    }
    try {
      const newState = session.engine.submitTurn(session.state, resolved.player!, resolved.opponent!);
      advance(newState);
      setPendingChoices({});
      setPendingMechanics({});
      setTurnError(null);
    } catch (err) {
      // A bad action (e.g. an illegal mechanic) must not leave both sides stuck showing
      // "ready" forever — un-submit so whoever caused it can pick again.
      setPendingChoices({});
      setPendingMechanics({});
      setTurnError(err instanceof Error ? err.message : "That turn couldn't be resolved. Please choose again.");
    }
  }

  function submitChoice(side: BattleSideId, action: BattleAction) {
    const next = { ...pendingChoices, [side]: action };
    setPendingChoices(next);
    setVoluntarySwitchFor(null);
    tryAdvanceTurn(next);
  }

  function autoPlayToEnd() {
    if (!session) return;
    let state = session.state;
    const snaps = [...session.snapshots];
    let iterations = 0;
    while (state.phase !== "ended" && iterations < 1000) {
      iterations++;
      if (state.phase === "switching") {
        for (const side of session.engine.getSidesNeedingSwitch(state)) {
          const controller = controllerFor(side);
          if (controller.type !== "ai") return; // can't auto-play past a human decision
          const replacementId = session.ais[side]!.chooseSwitchReplacement(state, side);
          state = session.engine.resolveForcedSwitch(state, side, replacementId);
          snaps.push(state);
        }
        continue;
      }
      if (controllerFor("player").type !== "ai" || controllerFor("opponent").type !== "ai") return;
      const playerAction = session.ais.player!.chooseAction(state, "player");
      const opponentAction = session.ais.opponent!.chooseAction(state, "opponent");
      state = session.engine.submitTurn(state, playerAction, opponentAction);
      snaps.push(state);
    }
    setSession({ ...session, state, snapshots: snaps });
  }

  if (!teamA.loaded || !teamB.loaded) {
    return <p className="p-8 text-ink-muted">Loading…</p>;
  }

  const teamAReady = isTeamComplete(teamA.team, TEAM_SIZE);
  const teamBReady = isTeamComplete(teamB.team, TEAM_SIZE);

  if (!session) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl text-ink">Battle</h1>
        {(!teamAReady || !teamBReady) && (
          <p className="rounded border-2 border-gold bg-gold/10 px-4 py-3 text-sm text-ink">
            Both teams need {TEAM_SIZE} Pokémon before you can battle.{" "}
            <Link href="/teams" className="font-medium underline">
              Go to Team Builder
            </Link>
            .
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <ControllerPicker label={`${teamA.team.name} (${teamA.team.members.length}/${TEAM_SIZE})`} value={teamAController} onChange={setTeamAController} />
          <ControllerPicker label={`${teamB.team.name} (${teamB.team.members.length}/${TEAM_SIZE})`} value={teamBController} onChange={setTeamBController} />
        </div>
        <button
          type="button"
          disabled={!teamAReady || !teamBReady}
          onClick={startBattle}
          className="self-start rounded border-2 border-gold bg-gold px-5 py-2 font-semibold text-gold-ink disabled:opacity-40"
        >
          Start Battle
        </button>
      </div>
    );
  }

  const bothAi = teamAController.type === "ai" && teamBController.type === "ai";
  const playerActive = session.state.sides.player.team[session.state.sides.player.activePokemonIndex];
  const opponentActive = session.state.sides.opponent.team[session.state.sides.opponent.activePokemonIndex];
  const logLines = narrateEvents(session.state.log, session.state);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-ink">Battle</h1>
        <button type="button" onClick={() => setSession(null)} className="text-sm text-ink-muted underline">
          End & reset
        </button>
      </div>

      {replayIndex !== null ? (
        <ReplayViewer snapshots={session.snapshots} onExit={() => setReplayIndex(null)} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <PokemonStatusCard pokemon={opponentActive} align="left" />
            <PokemonStatusCard pokemon={playerActive} align="right" />
          </div>

          <BattleLogPanel lines={logLines} />

          {turnError && (
            <p className="rounded border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{turnError}</p>
          )}

          {session.state.phase === "ended" ? (
            <BattleResultPanel state={session.state} onRematch={startBattle} onWatchReplay={() => setReplayIndex(0)} />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row">
          {(["player", "opponent"] as const).map((side) => {
            const controller = controllerFor(side);
            if (controller.type === "ai") return null;
            const battleSide = session.state.sides[side];
            const active = battleSide.team[battleSide.activePokemonIndex];
            const label = side === "player" ? teamA.team.name : teamB.team.name;

            if (session.state.phase === "switching") {
              if (!session.engine.getSidesNeedingSwitch(session.state).includes(side)) return null;
              return (
                <div key={side} className="flex-1">
                  <p className="mb-1 text-sm font-medium text-ink">{label}: choose a replacement</p>
                  <SwitchPicker
                    team={battleSide.team}
                    activeIndex={battleSide.activePokemonIndex}
                    onSelect={(id) => advance(session.engine.resolveForcedSwitch(session.state, side, id))}
                  />
                </div>
              );
            }

            if (pendingChoices[side]) {
              return (
                <p key={side} className="flex-1 text-sm text-ink-muted">
                  {label} is ready. Waiting on the other side…
                </p>
              );
            }

            if (voluntarySwitchFor === side) {
              return (
                <div key={side} className="flex-1">
                  <p className="mb-1 text-sm font-medium text-ink">{label}: switch to</p>
                  <SwitchPicker
                    team={battleSide.team}
                    activeIndex={battleSide.activePokemonIndex}
                    onSelect={(id) => submitChoice(side, { type: "switch", pokemonId: id })}
                    onCancel={() => setVoluntarySwitchFor(null)}
                  />
                </div>
              );
            }

            return (
              <div key={side} className="flex-1 space-y-2">
                <p className="text-sm font-medium text-ink">{label}</p>
                <MechanicToggleRow
                  state={session.state}
                  side={side}
                  selected={pendingMechanics[side]}
                  onToggle={(mechanic) => setPendingMechanics((prev) => ({ ...prev, [side]: mechanic }))}
                />
                <MoveButtonGrid
                  pokemon={active}
                  onSelect={(moveId) =>
                    submitChoice(side, { type: "move", pokemonId: active.id, moveId, mechanic: pendingMechanics[side] })
                  }
                />
                <button type="button" onClick={() => setVoluntarySwitchFor(side)} className="text-xs text-ink-muted underline">
                  Switch out
                </button>
              </div>
            );
          })}

          {bothAi && session.state.phase === "choosing" && (
            <div className="flex flex-1 gap-2">
              <button type="button" onClick={() => tryAdvanceTurn({})} className="rounded border-2 border-gold bg-gold px-4 py-2 text-sm font-semibold text-gold-ink">
                Next Turn
              </button>
              <button type="button" onClick={autoPlayToEnd} className="rounded border-2 border-panel-muted px-4 py-2 text-sm">
                Auto-Play to End
              </button>
            </div>
          )}
        </div>
          )}
        </>
      )}
    </div>
  );
}

function BattleResultPanel({ state, onRematch, onWatchReplay }: { state: BattleState; onRematch: () => void; onWatchReplay: () => void }) {
  const stats = computeBattleStats(state);
  const mvp = stats.mvpPokemonId ? findPokemonInState(state, stats.mvpPokemonId) : undefined;
  const winnerLabel = state.winner === "player" ? "Team A" : state.winner === "opponent" ? "Team B" : "Nobody";

  return (
    <div className="rounded-lg border-[3px] border-panel-ink bg-panel p-4 text-panel-ink shadow-[3px_3px_0_rgba(0,0,0,0.3)]">
      <p className="font-display text-lg">{winnerLabel} wins!</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-panel-ink/70 sm:grid-cols-4">
        <div>
          <dt>Turns</dt>
          <dd className="text-panel-ink">{state.turn}</dd>
        </div>
        <div>
          <dt>Team A left</dt>
          <dd className="text-panel-ink">{state.sides.player.team.filter((p) => !p.fainted).length}</dd>
        </div>
        <div>
          <dt>Team B left</dt>
          <dd className="text-panel-ink">{state.sides.opponent.team.filter((p) => !p.fainted).length}</dd>
        </div>
        <div>
          <dt>MVP</dt>
          <dd className="text-panel-ink">{mvp ? getDisplayName(mvp) : "—"}</dd>
        </div>
      </dl>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onRematch} className="rounded border-2 border-gold bg-gold px-4 py-1.5 text-sm font-semibold text-gold-ink">
          New Battle
        </button>
        <button type="button" onClick={onWatchReplay} className="rounded border-2 border-panel-muted px-4 py-1.5 text-sm">
          Watch Replay
        </button>
      </div>
    </div>
  );
}
