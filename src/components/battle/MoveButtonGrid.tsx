import { getMove } from "@/data/moves";
import { TypeBadge } from "@/components/TypeBadge";
import type { Pokemon } from "@/types/pokemon";

export function MoveButtonGrid({
  pokemon,
  onSelect,
  disabled = false,
}: {
  pokemon: Pokemon;
  onSelect: (moveId: string) => void;
  disabled?: boolean;
}) {
  const hasAnyPP = pokemon.moves.some((m) => m.currentPP > 0 && !m.disabled);

  if (!hasAnyPP) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect("struggle")}
        className="col-span-2 rounded border-2 border-panel-ink bg-panel-muted px-3 py-2 text-left text-sm font-medium text-panel-ink disabled:opacity-50"
      >
        Struggle <span className="text-xs text-panel-ink/60">(no moves left)</span>
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {pokemon.moves.map((battleMove) => {
        const move = getMove(battleMove.moveId);
        const outOfPP = battleMove.currentPP <= 0 || battleMove.disabled;
        return (
          <button
            key={battleMove.moveId}
            type="button"
            disabled={disabled || outOfPP}
            onClick={() => onSelect(battleMove.moveId)}
            className="flex flex-col gap-1 rounded border-2 border-panel-ink bg-panel px-3 py-2 text-left transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-panel"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-panel-ink">{move.name}</span>
              <TypeBadge type={move.type} small />
            </span>
            <span className="text-[11px] text-panel-ink/60">
              PP {battleMove.currentPP}/{battleMove.maxPP}
            </span>
          </button>
        );
      })}
    </div>
  );
}
