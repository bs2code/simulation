import { TYPE_BADGE_CLASS } from "@/lib/typeColors";
import type { PokemonType } from "@/types/pokemon";

export function TypeBadge({ type, small = false }: { type: PokemonType; small?: boolean }) {
  return (
    <span
      className={`inline-block rounded border border-black/10 font-medium ${TYPE_BADGE_CLASS[type]} ${
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      {type}
    </span>
  );
}
