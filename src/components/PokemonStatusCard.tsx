import { HpBar } from "./HpBar";
import { StatusBadge } from "./StatusBadge";
import { TypeBadge } from "./TypeBadge";
import { getDisplayName, getDisplayTypes } from "@/lib/pokemonDisplay";
import type { Pokemon } from "@/types/pokemon";

/**
 * The info box for one active Pokémon during battle — name, level, types, HP bar, status.
 * `align` mirrors the real games' asymmetric layout: the opponent's box sits upper-left of
 * their side, the player's sits lower-right of theirs.
 */
export function PokemonStatusCard({ pokemon, align }: { pokemon: Pokemon; align: "left" | "right" }) {
  return (
    <div
      className={`w-full max-w-xs rounded-lg border-[3px] border-panel-ink bg-panel px-4 py-3 text-panel-ink shadow-[3px_3px_0_rgba(0,0,0,0.35)] ${
        align === "right" ? "ml-auto" : ""
      } ${pokemon.fainted ? "opacity-50" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-display text-sm">{getDisplayName(pokemon)}</span>
        <span className="shrink-0 font-mono text-xs text-panel-ink/70">Lv.{pokemon.level}</span>
      </div>
      <div className="mt-1 flex gap-1">
        {getDisplayTypes(pokemon).map((type) => (
          <TypeBadge key={type} type={type} small />
        ))}
        <StatusBadge status={pokemon.status.condition} />
      </div>
      <div className="mt-2">
        <HpBar current={pokemon.currentHp} max={pokemon.stats.hp} />
      </div>
      {pokemon.fainted && <p className="mt-1 text-xs italic text-panel-ink/60">Fainted</p>}
    </div>
  );
}
