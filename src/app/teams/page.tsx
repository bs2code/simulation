"use client";

import { useState } from "react";
import { getAbility } from "@/data/abilities";
import { findItem } from "@/data/items";
import { getMove } from "@/data/moves";
import { getSpecies } from "@/data/pokemon";
import { PokemonSlotEditor } from "@/components/PokemonSlotEditor";
import { TypeBadge } from "@/components/TypeBadge";
import { isTeamComplete, useQuickTeams, useTeamSlot, type TeamSlot } from "@/lib/teamStorage";
import { STANDARD_RULES } from "@/types/rules";
import type { CreatePokemonConfig } from "@/utils/createPokemon";

const TEAM_SIZE = STANDARD_RULES.teamSize;

function TeamPanel({ slot }: { slot: TeamSlot }) {
  const { team, loaded, save } = useTeamSlot(slot);
  const { quickTeams, saveQuickTeam, deleteQuickTeam } = useQuickTeams();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (!loaded) {
    return <div className="rounded-lg border-[3px] border-panel-ink/30 bg-panel/50 p-6 text-panel-ink/50">Loading…</div>;
  }

  const complete = isTeamComplete(team, TEAM_SIZE);

  const saveSlot = (index: number, config: CreatePokemonConfig) => {
    const members = [...team.members];
    members[index] = config;
    save({ ...team, members });
    setEditingIndex(null);
  };

  const removeSlot = (index: number) => {
    save({ ...team, members: team.members.filter((_, i) => i !== index) });
    setEditingIndex(null);
  };

  const clearTeam = () => {
    if (team.members.length === 0) return;
    if (!window.confirm(`Remove all Pokémon from ${team.name}? This can't be undone.`)) return;
    save({ ...team, members: [] });
    setEditingIndex(null);
  };

  const saveAsQuickTeam = () => {
    if (team.members.length === 0) return;
    const name = window.prompt("Name this Quick Team:", team.name);
    if (!name) return;
    saveQuickTeam(name, team.members);
  };

  const applyQuickTeam = (quickTeamName: string, members: CreatePokemonConfig[]) => {
    if (
      team.members.length > 0 &&
      !window.confirm(`Replace ${team.name}'s current Pokémon with "${quickTeamName}"? This can't be undone.`)
    ) {
      return;
    }
    save({ ...team, members });
    setEditingIndex(null);
  };

  return (
    <section className="flex-1">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">{team.name}</h2>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${complete ? "bg-success text-panel" : "bg-panel-ink/20 text-ink-muted"}`}>
            {team.members.length}/{TEAM_SIZE} {complete ? "· Ready" : ""}
          </span>
          {team.members.length > 0 && (
            <>
              <button type="button" onClick={saveAsQuickTeam} className="text-xs text-ink-muted underline hover:text-ink">
                Save as Quick Team
              </button>
              <button type="button" onClick={clearTeam} className="text-xs text-ink-muted underline hover:text-danger">
                Clear team
              </button>
            </>
          )}
        </div>
      </div>

      {quickTeams.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border-2 border-dashed border-panel-muted/60 p-2.5">
          <span className="text-xs text-ink-muted">Quick add:</span>
          {quickTeams.map((qt) => (
            <span key={qt.id} className="flex items-center gap-1 rounded-full border-2 border-panel-muted/60 py-0.5 pl-2.5 pr-1 text-xs">
              <button type="button" onClick={() => applyQuickTeam(qt.name, qt.members)} className="text-ink hover:text-gold">
                {qt.name} ({qt.members.length})
              </button>
              <button
                type="button"
                onClick={() => deleteQuickTeam(qt.id)}
                aria-label={`Delete Quick Team "${qt.name}"`}
                className="px-1 text-ink-muted hover:text-danger"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: TEAM_SIZE }).map((_, index) => {
          const config = team.members[index];
          if (!config) {
            return (
              <button
                key={index}
                type="button"
                onClick={() => setEditingIndex(index)}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border-[3px] border-dashed border-panel-muted/60 text-ink-muted transition-colors hover:border-gold hover:text-gold"
              >
                <span className="font-display text-2xl leading-none">+</span>
                <span className="text-xs">Add Pokémon</span>
              </button>
            );
          }

          const species = getSpecies(config.speciesId);
          const form = config.form ? species.forms?.find((f) => f.id === config.form) : undefined;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setEditingIndex(index)}
              className="flex aspect-[4/3] flex-col justify-between rounded-lg border-[3px] border-panel-ink bg-panel p-2.5 text-left text-panel-ink shadow-[3px_3px_0_rgba(0,0,0,0.3)] transition-transform hover:-translate-y-0.5"
            >
              <div>
                <p className="truncate font-display text-xs">{form?.name ?? species.name}</p>
                <p className="text-[11px] text-panel-ink/60">
                  Lv.{config.level} · {getAbility(config.ability).name}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {(form?.types ?? species.types).map((t) => (
                  <TypeBadge key={t} type={t} small />
                ))}
              </div>
              <p className="truncate text-[11px] text-panel-ink/70">
                {config.moveIds.map((m) => getMove(m).name).join(" · ")}
              </p>
              {config.item && <p className="truncate text-[11px] text-panel-ink/60">{findItem(config.item)?.name}</p>}
            </button>
          );
        })}
      </div>

      {editingIndex !== null && (
        <div className="mt-4">
          <PokemonSlotEditor
            initial={team.members[editingIndex]}
            onSave={(config) => saveSlot(editingIndex, config)}
            onCancel={() => setEditingIndex(null)}
            onRemove={team.members[editingIndex] ? () => removeSlot(editingIndex) : undefined}
          />
        </div>
      )}
    </section>
  );
}

export default function TeamsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Team Builder</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Build two teams of {TEAM_SIZE}. Teams save automatically and carry over to Battle and Simulate.
        </p>
      </div>
      <div className="flex flex-col gap-10 lg:flex-row">
        <TeamPanel slot="A" />
        <TeamPanel slot="B" />
      </div>
    </div>
  );
}
