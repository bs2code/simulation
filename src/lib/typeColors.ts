import type { PokemonType } from "@/types/pokemon";

/**
 * Literal Tailwind class strings (not template-composed) so the v4 build scanner can see and
 * generate them — the type colors are defined once as CSS tokens in globals.css and everything
 * else (badges, move buttons, HP-bar accents) draws from this single map.
 */
export const TYPE_BADGE_CLASS: Record<PokemonType, string> = {
  Normal: "bg-type-normal text-panel-ink",
  Fire: "bg-type-fire text-panel-ink",
  Water: "bg-type-water text-panel-ink",
  Electric: "bg-type-electric text-panel-ink",
  Grass: "bg-type-grass text-panel-ink",
  Ice: "bg-type-ice text-panel-ink",
  Fighting: "bg-type-fighting text-panel",
  Poison: "bg-type-poison text-panel",
  Ground: "bg-type-ground text-panel-ink",
  Flying: "bg-type-flying text-panel-ink",
  Psychic: "bg-type-psychic text-panel-ink",
  Bug: "bg-type-bug text-panel-ink",
  Rock: "bg-type-rock text-panel-ink",
  Ghost: "bg-type-ghost text-panel",
  Dragon: "bg-type-dragon text-panel",
  Dark: "bg-type-dark text-panel",
  Steel: "bg-type-steel text-panel-ink",
  Fairy: "bg-type-fairy text-panel-ink",
};

export const TYPE_BORDER_CLASS: Record<PokemonType, string> = {
  Normal: "border-type-normal",
  Fire: "border-type-fire",
  Water: "border-type-water",
  Electric: "border-type-electric",
  Grass: "border-type-grass",
  Ice: "border-type-ice",
  Fighting: "border-type-fighting",
  Poison: "border-type-poison",
  Ground: "border-type-ground",
  Flying: "border-type-flying",
  Psychic: "border-type-psychic",
  Bug: "border-type-bug",
  Rock: "border-type-rock",
  Ghost: "border-type-ghost",
  Dragon: "border-type-dragon",
  Dark: "border-type-dark",
  Steel: "border-type-steel",
  Fairy: "border-type-fairy",
};
