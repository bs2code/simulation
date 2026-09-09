import { getDisplayName } from "@/lib/pokemonDisplay";
import type { Pokemon } from "@/types/pokemon";
import { HpBar } from "@/components/HpBar";

export function SwitchPicker({
  team,
  activeIndex,
  onSelect,
  onCancel,
}: {
  team: Pokemon[];
  activeIndex: number;
  onSelect: (pokemonId: string) => void;
  onCancel?: () => void;
}) {
  return (
    <div className="rounded border-2 border-panel-ink bg-panel p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {team.map((pokemon, index) => {
          const disabled = index === activeIndex || pokemon.fainted;
          return (
            <button
              key={pokemon.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(pokemon.id)}
              className="flex flex-col gap-1 rounded border-2 border-panel-ink/50 px-2 py-1.5 text-left transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="truncate text-xs font-medium text-panel-ink">{getDisplayName(pokemon)}</span>
              <HpBar current={pokemon.currentHp} max={pokemon.stats.hp} />
            </button>
          );
        })}
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-2 text-xs text-panel-ink/60 underline">
          Cancel
        </button>
      )}
    </div>
  );
}
