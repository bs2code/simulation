"use client";

import { useState } from "react";
import { getAbility } from "@/data/abilities";
import { getAllItems } from "@/data/items";
import { getMove } from "@/data/moves";
import { getAllSpecies, getSpecies } from "@/data/pokemon";
import { TypeBadge } from "./TypeBadge";
import { NATURES, type Nature } from "@/types/pokemon";
import type { CreatePokemonConfig } from "@/utils/createPokemon";

const MAX_MOVES = 4;
const MIN_LEVEL = 1;
const MAX_LEVEL = 100;

function defaultConfigForSpecies(speciesId: string): CreatePokemonConfig {
  const species = getSpecies(speciesId);
  return {
    id: "draft",
    speciesId,
    level: 50,
    nature: "Hardy",
    ability: species.abilities[0],
    moveIds: species.moves.slice(0, MAX_MOVES),
  };
}

export function PokemonSlotEditor({
  initial,
  onSave,
  onCancel,
  onRemove,
}: {
  initial: CreatePokemonConfig | undefined;
  onSave: (config: CreatePokemonConfig) => void;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const [draft, setDraft] = useState<CreatePokemonConfig>(
    initial ?? defaultConfigForSpecies(getAllSpecies()[0].id)
  );
  const species = getSpecies(draft.speciesId);
  const itemData = getAllItems();

  const setSpecies = (speciesId: string) => setDraft(defaultConfigForSpecies(speciesId));

  const toggleMove = (moveId: string) => {
    setDraft((prev) => {
      const has = prev.moveIds.includes(moveId);
      if (has) return { ...prev, moveIds: prev.moveIds.filter((m) => m !== moveId) };
      if (prev.moveIds.length >= MAX_MOVES) return prev;
      return { ...prev, moveIds: [...prev.moveIds, moveId] };
    });
  };

  const megaForm = species.forms?.find((f) => f.formCategory === "mega" && f.requiredItem === draft.item);
  const canGigantamax = species.forms?.some((f) => f.formCategory === "gigantamax") ?? false;
  const canZMove = draft.item === "z-crystal";

  return (
    <div className="rounded-lg border-[3px] border-panel-ink bg-panel p-4 text-panel-ink shadow-[4px_4px_0_rgba(0,0,0,0.35)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Species
          <select
            className="rounded border-2 border-panel-ink bg-white px-2 py-1.5"
            value={draft.speciesId}
            onChange={(e) => setSpecies(e.target.value)}
          >
            {getAllSpecies().map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Level
          <input
            type="number"
            min={MIN_LEVEL}
            max={MAX_LEVEL}
            className="rounded border-2 border-panel-ink bg-white px-2 py-1.5"
            value={draft.level}
            onChange={(e) => {
              const value = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Number(e.target.value) || MIN_LEVEL));
              setDraft((prev) => ({ ...prev, level: value }));
            }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Nature
          <select
            className="rounded border-2 border-panel-ink bg-white px-2 py-1.5"
            value={draft.nature}
            onChange={(e) => setDraft((prev) => ({ ...prev, nature: e.target.value as Nature }))}
          >
            {NATURES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Ability
          <select
            className="rounded border-2 border-panel-ink bg-white px-2 py-1.5"
            value={draft.ability}
            onChange={(e) => setDraft((prev) => ({ ...prev, ability: e.target.value }))}
          >
            {species.abilities.map((abilityId) => (
              <option key={abilityId} value={abilityId}>
                {getAbility(abilityId).name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Held item
          <select
            className="rounded border-2 border-panel-ink bg-white px-2 py-1.5"
            value={draft.item ?? ""}
            onChange={(e) => setDraft((prev) => ({ ...prev, item: e.target.value || undefined }))}
          >
            <option value="">None</option>
            {itemData.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <p className="text-sm">
          Moves <span className="text-panel-ink/60">({draft.moveIds.length}/{MAX_MOVES})</span>
        </p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
          {species.moves.map((moveId) => {
            const move = getMove(moveId);
            const selected = draft.moveIds.includes(moveId);
            const disabled = !selected && draft.moveIds.length >= MAX_MOVES;
            return (
              <button
                key={moveId}
                type="button"
                disabled={disabled}
                onClick={() => toggleMove(moveId)}
                className={`flex items-center justify-between gap-2 rounded border-2 px-2 py-1.5 text-left text-sm transition-colors ${
                  selected
                    ? "border-gold bg-gold/20"
                    : disabled
                      ? "border-panel-ink/20 text-panel-ink/40"
                      : "border-panel-ink/40 hover:border-panel-ink"
                }`}
              >
                <span>{move.name}</span>
                <TypeBadge type={move.type} small />
              </button>
            );
          })}
        </div>
      </div>

      {(megaForm || canGigantamax || canZMove) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-panel-ink/70">
          {megaForm && <span className="rounded border border-panel-ink/30 px-2 py-1">Can Mega Evolve → {megaForm.name}</span>}
          {canGigantamax && <span className="rounded border border-panel-ink/30 px-2 py-1">Can Gigantamax</span>}
          {canZMove && <span className="rounded border border-panel-ink/30 px-2 py-1">Can use a Z-Move</span>}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave({ ...draft, id: "draft" })}
            disabled={draft.moveIds.length === 0}
            className="rounded border-2 border-gold bg-gold px-4 py-1.5 text-sm font-semibold text-gold-ink disabled:opacity-40"
          >
            Save
          </button>
          <button type="button" onClick={onCancel} className="rounded border-2 border-panel-ink/40 px-4 py-1.5 text-sm">
            Cancel
          </button>
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-sm text-danger underline">
            Remove from team
          </button>
        )}
      </div>
    </div>
  );
}
