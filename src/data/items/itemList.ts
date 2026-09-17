import { MEGA_EVOLUTIONS } from "@/data/pokemon/megaEvolutions";
import { SWITCH_IN_FORMS } from "@/data/pokemon/switchInForms";
import { ULTRA_BURST_FORMS } from "@/data/pokemon/ultraBurst";
import type { PokemonForm } from "@/types/pokemon";
import type { Item } from "@/types/items";

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

/**
 * One inert stone/orb item per item-gated form-changing entry across the Mega Evolution, Primal
 * Reversion/Crowned-forme/Origin-forme, and Ultra Burst tables — kept in sync automatically (no
 * id can drift out of sync with a form's `requiredItem`, since both come from the same source).
 * Rayquaza's Mega entry has no `requiredItem` (it's gated on knowing Dragon Ascent instead, see
 * megaEvolutions.ts), so it's filtered out here rather than generating a bogus stone item.
 */
const FORM_TABLES: { speciesId: string; form: PokemonForm }[] = [...MEGA_EVOLUTIONS, ...SWITCH_IN_FORMS, ...ULTRA_BURST_FORMS];

const FORM_GATING_ITEMS: Item[] = Array.from(
  new Map(
    FORM_TABLES.filter(({ form }) => form.requiredItem).map(({ form }) => [
      form.requiredItem!,
      { id: form.requiredItem!, name: titleCaseFromSlug(form.requiredItem!), triggers: [], effects: [] } satisfies Item,
    ])
  ).values()
);

/** Data-driven held items. Engine code dispatches on `effects[].kind`, never on item id/name. */
export const ITEM_LIST: Item[] = [
  {
    id: "leftovers",
    name: "Leftovers",
    triggers: ["end-of-turn"],
    effects: [{ kind: "end-of-turn-heal", fraction: 1 / 16 }],
  },
  {
    id: "life-orb",
    name: "Life Orb",
    triggers: ["on-damage-calc-attacker", "after-dealing-damage"],
    effects: [
      { kind: "damage-multiplier", multiplier: 1.3 },
      { kind: "recoil-after-attack", fraction: 0.1 },
    ],
  },
  {
    id: "charcoal",
    name: "Charcoal",
    triggers: ["on-damage-calc-attacker"],
    effects: [{ kind: "type-power-boost", type: "Fire", multiplier: 1.2 }],
  },
  {
    id: "mystic-water",
    name: "Mystic Water",
    triggers: ["on-damage-calc-attacker"],
    effects: [{ kind: "type-power-boost", type: "Water", multiplier: 1.2 }],
  },
  {
    id: "focus-sash",
    name: "Focus Sash",
    triggers: ["on-lethal-damage"],
    effects: [{ kind: "survive-lethal-hit" }],
  },
  {
    id: "choice-band",
    name: "Choice Band",
    triggers: ["on-damage-calc-attacker"],
    effects: [{ kind: "stat-multiplier", stat: "attack", multiplier: 1.5 }, { kind: "choice-lock" }],
  },
  {
    id: "choice-specs",
    name: "Choice Specs",
    triggers: ["on-damage-calc-attacker"],
    effects: [{ kind: "stat-multiplier", stat: "specialAttack", multiplier: 1.5 }, { kind: "choice-lock" }],
  },
  {
    id: "choice-scarf",
    name: "Choice Scarf",
    triggers: ["speed-calc"],
    effects: [{ kind: "stat-multiplier", stat: "speed", multiplier: 1.5 }, { kind: "choice-lock" }],
  },
  // Mega Stones, Primal orbs, Crowned/Origin relics, Ultra Burst crystals, and Z-Crystals aren't
  // consumed and don't hook into ItemEngine's damage/heal triggers at all — MechanicsEngine
  // checks a Pokémon's held item id directly against the form's `requiredItem`, or (Z-Crystal)
  // as a general Z-Move unlock marker.
  { id: "charizardite-x", name: "Charizardite X", triggers: [], effects: [] },
  { id: "charizardite-y", name: "Charizardite Y", triggers: [], effects: [] },
  { id: "lucarionite", name: "Lucarionite", triggers: [], effects: [] },
  { id: "galladite", name: "Galladite", triggers: [], effects: [] },
  { id: "z-crystal", name: "Z-Crystal", triggers: [], effects: [] },
  ...FORM_GATING_ITEMS,
];
