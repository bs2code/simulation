import type { Item } from "@/types/items";

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
  // Mega Stones and Z-Crystals aren't consumed and don't hook into ItemEngine's damage/heal
  // triggers at all — MechanicsEngine checks a Pokémon's held item id directly against the
  // form's `requiredItem` (Mega Stones) or as a general Z-Move unlock marker (Z-Crystal).
  { id: "charizardite-x", name: "Charizardite X", triggers: [], effects: [] },
  { id: "charizardite-y", name: "Charizardite Y", triggers: [], effects: [] },
  { id: "lucarionite", name: "Lucarionite", triggers: [], effects: [] },
  { id: "galladite", name: "Galladite", triggers: [], effects: [] },
  { id: "z-crystal", name: "Z-Crystal", triggers: [], effects: [] },
];
