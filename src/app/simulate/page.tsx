"use client";

import { useState } from "react";
import Link from "next/link";
import { type AIDifficulty } from "@/ai/BattleAI";
import { ReplayViewer } from "@/components/battle/ReplayViewer";
import { getDisplayName } from "@/lib/pokemonDisplay";
import { buildTeamFromSaved, isTeamComplete, useTeamSlot } from "@/lib/teamStorage";
import { runSimulationBatch, type SimulationBatchSummary } from "@/simulation/runSimulationBatch";
import { simulateBattle } from "@/simulation/simulateBattle";
import type { SimulationResult } from "@/simulation/types";
import { STANDARD_RULES } from "@/types/rules";
import type { Pokemon } from "@/types/pokemon";
import type { BattleReplay } from "@/types/replay";

const TEAM_SIZE = STANDARD_RULES.teamSize;
const RUN_COUNTS = [1, 10, 100] as const;

function DifficultyPicker({ label, value, onChange }: { label: string; value: AIDifficulty; onChange: (d: AIDifficulty) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <select
        className="rounded border-2 border-panel-ink bg-white px-2 py-1.5 text-panel-ink"
        value={value}
        onChange={(e) => onChange(e.target.value as AIDifficulty)}
      >
        <option value="easy">Easy</option>
        <option value="normal">Normal</option>
        <option value="expert">Expert</option>
      </select>
    </label>
  );
}

function pokemonName(team: Pokemon[], pokemonId: string | undefined): string {
  if (!pokemonId) return "—";
  const pokemon = team.find((p) => p.id === pokemonId);
  return pokemon ? getDisplayName(pokemon) : pokemonId;
}

export default function SimulatePage() {
  const teamA = useTeamSlot("A");
  const teamB = useTeamSlot("B");
  const [difficultyA, setDifficultyA] = useState<AIDifficulty>("normal");
  const [difficultyB, setDifficultyB] = useState<AIDifficulty>("normal");
  const [runCount, setRunCount] = useState<(typeof RUN_COUNTS)[number]>(1);

  const [summary, setSummary] = useState<SimulationBatchSummary | null>(null);
  const [seedBase, setSeedBase] = useState<number | null>(null);
  const [replay, setReplay] = useState<BattleReplay | null>(null);

  const teamAReady = isTeamComplete(teamA.team, TEAM_SIZE);
  const teamBReady = isTeamComplete(teamB.team, TEAM_SIZE);
  const readyToSimulate = teamAReady && teamBReady;

  function runSimulation() {
    const seed = Date.now();
    setSeedBase(seed);
    setReplay(null);
    const playerTeam = buildTeamFromSaved("A", teamA.team);
    const opponentTeam = buildTeamFromSaved("B", teamB.team);
    const options = { rules: STANDARD_RULES, playerDifficulty: difficultyA, opponentDifficulty: difficultyB };

    if (runCount === 1) {
      const { result, replay: singleReplay } = simulateBattle(playerTeam, opponentTeam, seed, {
        ...options,
        recordReplay: true,
      });
      setSummary({
        results: [result],
        playerWinRate: result.winner === "player" ? 1 : 0,
        opponentWinRate: result.winner === "opponent" ? 1 : 0,
        drawRate: result.winner ? 0 : 1,
        averageTurns: result.turns,
        averageSurvivorsPlayer: result.remainingPlayerCount,
        averageSurvivorsOpponent: result.remainingOpponentCount,
        mvpPokemonId: result.mvpPokemonId,
      });
      setReplay(singleReplay ?? null);
      return;
    }

    setSummary(runSimulationBatch(playerTeam, opponentTeam, seed, runCount, options));
  }

  function viewReplayFor(result: SimulationResult) {
    const playerTeam = buildTeamFromSaved("A", teamA.team);
    const opponentTeam = buildTeamFromSaved("B", teamB.team);
    const { replay: rerun } = simulateBattle(playerTeam, opponentTeam, result.seed, {
      rules: STANDARD_RULES,
      playerDifficulty: difficultyA,
      opponentDifficulty: difficultyB,
      recordReplay: true,
    });
    setReplay(rerun ?? null);
  }

  const referenceTeamA = readyToSimulate ? buildTeamFromSaved("A", teamA.team) : [];
  const referenceTeamB = readyToSimulate ? buildTeamFromSaved("B", teamB.team) : [];
  const allPokemon = [...referenceTeamA, ...referenceTeamB];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Simulate</h1>
        <p className="mt-1 text-sm text-ink-muted">Let AI play both sides, once or a hundred times.</p>
      </div>

      {!readyToSimulate && (
        <p className="rounded border-2 border-gold bg-gold/10 px-4 py-3 text-sm text-ink">
          Both teams need {TEAM_SIZE} Pokémon before you can simulate.{" "}
          <Link href="/teams" className="font-medium underline">
            Go to Team Builder
          </Link>
          .
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <DifficultyPicker label={`${teamA.team.name} AI`} value={difficultyA} onChange={setDifficultyA} />
        <DifficultyPicker label={`${teamB.team.name} AI`} value={difficultyB} onChange={setDifficultyB} />
        <label className="flex flex-col gap-1 text-sm">
          Battles to run
          <select
            className="rounded border-2 border-panel-ink bg-white px-2 py-1.5 text-panel-ink"
            value={runCount}
            onChange={(e) => setRunCount(Number(e.target.value) as (typeof RUN_COUNTS)[number])}
          >
            {RUN_COUNTS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!readyToSimulate}
          onClick={runSimulation}
          className="rounded border-2 border-gold bg-gold px-5 py-2 font-semibold text-gold-ink disabled:opacity-40"
        >
          Simulate {runCount > 1 ? `${runCount} Battles` : "Battle"}
        </button>
      </div>

      {summary && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border-[3px] border-panel-ink bg-panel p-4 text-panel-ink shadow-[3px_3px_0_rgba(0,0,0,0.3)]">
            <p className="font-display text-sm">
              {seedBase !== null && `Seed base ${seedBase} · `}
              {summary.results.length} {summary.results.length === 1 ? "battle" : "battles"} simulated
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-panel-ink/60">{teamA.team.name} win rate</dt>
                <dd className="text-lg">{Math.round(summary.playerWinRate * 100)}%</dd>
              </div>
              <div>
                <dt className="text-xs text-panel-ink/60">{teamB.team.name} win rate</dt>
                <dd className="text-lg">{Math.round(summary.opponentWinRate * 100)}%</dd>
              </div>
              <div>
                <dt className="text-xs text-panel-ink/60">Avg. turns</dt>
                <dd className="text-lg">{summary.averageTurns.toFixed(1)}</dd>
              </div>
              <div>
                <dt className="text-xs text-panel-ink/60">Avg. survivors (A / B)</dt>
                <dd className="text-lg">
                  {summary.averageSurvivorsPlayer.toFixed(1)} / {summary.averageSurvivorsOpponent.toFixed(1)}
                </dd>
              </div>
            </dl>
            {summary.mvpPokemonId && (
              <p className="mt-3 text-sm">
                MVP: <span className="font-medium">{pokemonName(allPokemon, summary.mvpPokemonId)}</span>
              </p>
            )}
          </div>

          {summary.results.length > 1 && (
            <div className="overflow-x-auto rounded border-2 border-panel-muted/40">
              <table className="w-full text-left text-sm">
                <thead className="bg-panel-ink/5 text-ink-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Winner</th>
                    <th className="px-3 py-2 font-medium">Turns</th>
                    <th className="px-3 py-2 font-medium">A left</th>
                    <th className="px-3 py-2 font-medium">B left</th>
                    <th className="px-3 py-2 font-medium">MVP</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {summary.results.map((result, index) => (
                    <tr key={result.seed} className="border-t border-panel-muted/30">
                      <td className="px-3 py-1.5">{index + 1}</td>
                      <td className="px-3 py-1.5">
                        {result.winner === "player" ? teamA.team.name : result.winner === "opponent" ? teamB.team.name : "Draw"}
                      </td>
                      <td className="px-3 py-1.5">{result.turns}</td>
                      <td className="px-3 py-1.5">{result.remainingPlayerCount}</td>
                      <td className="px-3 py-1.5">{result.remainingOpponentCount}</td>
                      <td className="px-3 py-1.5">{pokemonName(allPokemon, result.mvpPokemonId)}</td>
                      <td className="px-3 py-1.5">
                        <button type="button" onClick={() => viewReplayFor(result)} className="text-xs text-gold underline">
                          View replay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {replay && (
            <div>
              <h2 className="mb-2 font-display text-sm text-ink">Replay</h2>
              <ReplayViewer snapshots={replay.snapshots.length > 0 ? replay.snapshots : [replay.initialState]} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
