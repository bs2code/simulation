import type { Ability } from "@/types/abilities";

/**
 * Data-driven ability definitions. AbilityEngine/DamageEngine dispatch on `effects[].kind`,
 * never on an ability's id or name, so adding a new ability never means touching engine code
 * as long as its behavior is expressible with existing effect kinds.
 *
 * A handful of abilities here (Cursed Body, Protean, Battle Bond) are declared with no effects
 * yet — they exist as data so species can reference them, but their behavior needs mechanics
 * this engine doesn't have (move disabling, on-the-fly type changes, Phase 4 mechanics).
 */
export const ABILITY_LIST: Ability[] = [
  {
    id: "blaze",
    name: "Blaze",
    triggers: ["on-damage-calc-attacker"],
    effects: [{ kind: "low-hp-stab-boost", type: "Fire", hpThreshold: 1 / 3, multiplier: 1.5 }],
  },
  {
    id: "torrent",
    name: "Torrent",
    triggers: ["on-damage-calc-attacker"],
    effects: [{ kind: "low-hp-stab-boost", type: "Water", hpThreshold: 1 / 3, multiplier: 1.5 }],
  },
  {
    id: "overgrow",
    name: "Overgrow",
    triggers: ["on-damage-calc-attacker"],
    effects: [{ kind: "low-hp-stab-boost", type: "Grass", hpThreshold: 1 / 3, multiplier: 1.5 }],
  },
  {
    id: "levitate",
    name: "Levitate",
    triggers: ["on-damage-calc-defender"],
    effects: [{ kind: "type-immunity", type: "Ground" }],
  },
  {
    id: "lightning-rod",
    name: "Lightning Rod",
    triggers: ["on-damage-calc-defender"],
    // Real Lightning Rod redirects Electric moves in doubles and boosts SpA when hit;
    // simplified here to a straight immunity since this engine only supports singles so far.
    effects: [{ kind: "type-immunity", type: "Electric" }],
  },
  {
    id: "static",
    name: "Static",
    triggers: ["on-hit-by-move"],
    effects: [{ kind: "contact-status-chance", status: "paralysis", chance: 30 }],
  },
  {
    id: "rain-dish",
    name: "Rain Dish",
    triggers: ["end-of-turn"],
    effects: [{ kind: "weather-end-of-turn-heal", weather: "rain", fraction: 1 / 16 }],
  },
  {
    id: "chlorophyll",
    name: "Chlorophyll",
    triggers: ["speed-calc"],
    effects: [{ kind: "weather-stat-multiplier", weather: "sun", stat: "speed", multiplier: 2 }],
  },
  {
    id: "solar-power",
    name: "Solar Power",
    triggers: ["on-damage-calc-attacker", "end-of-turn"],
    effects: [
      { kind: "weather-stat-multiplier", weather: "sun", stat: "specialAttack", multiplier: 1.5 },
      { kind: "weather-end-of-turn-damage", weather: "sun", fraction: 1 / 8 },
    ],
  },
  {
    id: "sand-rush",
    name: "Sand Rush",
    triggers: ["speed-calc"],
    effects: [{ kind: "weather-stat-multiplier", weather: "sandstorm", stat: "speed", multiplier: 2 }],
  },
  { id: "cursed-body", name: "Cursed Body", triggers: [], effects: [] },
  { id: "protean", name: "Protean", triggers: [], effects: [] },
  { id: "battle-bond", name: "Battle Bond", triggers: [], effects: [] },
  { id: "steadfast", name: "Steadfast", triggers: [], effects: [] },
  { id: "inner-focus", name: "Inner Focus", triggers: [], effects: [] },
  { id: "sharpness", name: "Sharpness", triggers: [], effects: [] },
  { id: "tough-claws", name: "Tough Claws", triggers: [], effects: [] },
  { id: "drought", name: "Drought", triggers: [], effects: [] },
];
