import type { BattleMechanic } from "./mechanics";
import type { NonVolatileStatus, Pokemon, StatStages } from "./pokemon";
import type { BattleRules } from "./rules";

export type WeatherId = "none" | "sun" | "rain" | "sandstorm" | "hail" | "snow";
export type TerrainId = "none" | "electric" | "grassy" | "misty" | "psychic";

/** Environmental/situational inputs the damage engine needs but does not own. */
export type DamageContext = {
  weather?: WeatherId;
  terrain?: TerrainId;
  /** True when the move is hitting multiple targets at once (applies a spread-move penalty). */
  isSpreadMove?: boolean;
  /** Force a specific crit outcome; used by tests. When omitted the engine rolls it via RNG. */
  forceCritical?: boolean;
  /** Force a specific damage roll (85-100); used by tests. When omitted the engine rolls it via RNG. */
  forceRandomRoll?: number;
};

/** Full breakdown of a single damage calculation, returned so the UI can narrate it. */
export type DamageResult = {
  damage: number;
  critical: boolean;
  effectiveness: number;
  randomModifier: number;
  boostedByWeather: boolean;
  resisted: boolean;
  superEffective: boolean;
  /** True if the move type matched one of the attacker's types (STAB applied). */
  stab: boolean;
  /** True when effectiveness is exactly 0 (immune). */
  immune: boolean;
};

// ---------------------------------------------------------------------------
// BattleState, sides, actions, phases, and events.
// ---------------------------------------------------------------------------

export type WeatherState = {
  id: WeatherId;
  turnsRemaining: number;
};

export type TerrainState = {
  id: TerrainId;
  turnsRemaining: number;
};

/** Entry hazards laid on one side of the field (Stealth Rock, Spikes, etc). */
export type Hazards = {
  stealthRock: boolean;
  spikes: number;
  toxicSpikes: number;
  stickyWeb: boolean;
};

export function createDefaultHazards(): Hazards {
  return { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false };
}

/** A timed side-wide effect such as Reflect, Light Screen, or Tailwind. Reserved for a later phase. */
export type SideEffect = {
  id: string;
  turnsRemaining: number;
};

/** Field-wide effects such as Trick Room or Gravity that aren't tied to either side. Reserved for a later phase. */
export type FieldState = {
  activeEffects: { id: string; turnsRemaining: number }[];
};

export function createDefaultFieldState(): FieldState {
  return { activeEffects: [] };
}

export type BattlePhase =
  | "team-preview"
  | "choosing"
  | "executing"
  | "switching"
  | "fainting"
  | "ended";

export type BattleSideId = "player" | "opponent";

export function otherSide(side: BattleSideId): BattleSideId {
  return side === "player" ? "opponent" : "player";
}

/** How many times each mechanic has been activated by this side so far this battle. */
export type MechanicUsage = {
  mega: number;
  zMove: number;
  gigantamax: number;
};

export function createDefaultMechanicUsage(): MechanicUsage {
  return { mega: 0, zMove: 0, gigantamax: 0 };
}

export type BattleSide = {
  team: Pokemon[];
  activePokemonIndex: number;
  hazards: Hazards;
  sideEffects: SideEffect[];
  mechanicUsage: MechanicUsage;
};

export function createBattleSide(team: Pokemon[]): BattleSide {
  return {
    team,
    activePokemonIndex: 0,
    hazards: createDefaultHazards(),
    sideEffects: [],
    mechanicUsage: createDefaultMechanicUsage(),
  };
}

export type BattleState = {
  turn: number;
  phase: BattlePhase;
  weather: WeatherState;
  terrain: TerrainState;
  rules: BattleRules;
  sides: {
    player: BattleSide;
    opponent: BattleSide;
  };
  field: FieldState;
  log: BattleEvent[];
  winner?: BattleSideId;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type MoveAction = {
  type: "move";
  pokemonId: string;
  moveId: string;
  /** Activates this mechanic (if legal) before the move executes this turn. */
  mechanic?: BattleMechanic;
};

export type SwitchAction = {
  type: "switch";
  /** The id of the Pokémon being switched IN. */
  pokemonId: string;
};

/** Reserved for a future standalone mechanic-activation action; unused until Phase 4. */
export type MechanicAction = {
  type: "mechanic";
  pokemonId: string;
  mechanic: BattleMechanic;
};

export type BattleAction = MoveAction | SwitchAction | MechanicAction;

// ---------------------------------------------------------------------------
// Events — the log is meant to be replayable: enough detail here to reconstruct what happened.
// ---------------------------------------------------------------------------

/** Why a Pokémon couldn't act this turn despite choosing a move. */
export type MovePreventedReason = "sleep" | "frozen" | "paralysis" | "flinch" | "confusion";

/** What caused HP loss outside of a direct move hit. */
export type SecondaryDamageCause =
  | "burn"
  | "poison"
  | "badly-poisoned"
  | "sandstorm"
  | "hail"
  | "solar-power"
  | "life-orb"
  | "recoil"
  | "confusion"
  | "stealth-rock"
  | "spikes"
  | "toxic-spikes";

/** What caused a heal outside of a direct move effect. */
export type HealCause = "leftovers" | "rain-dish" | "grassy-terrain" | "move";

export type HazardId = "stealth-rock" | "spikes" | "toxic-spikes" | "sticky-web";

export type BattleEvent =
  | { type: "turn-start"; turn: number }
  | { type: "move-used"; side: BattleSideId; pokemonId: string; moveId: string }
  | { type: "move-missed"; side: BattleSideId; pokemonId: string; moveId: string }
  | { type: "move-prevented"; side: BattleSideId; pokemonId: string; reason: MovePreventedReason }
  | {
      type: "damage";
      side: BattleSideId;
      pokemonId: string;
      amount: number;
      remainingHp: number;
      result: DamageResult;
    }
  | { type: "fainted"; side: BattleSideId; pokemonId: string }
  | {
      type: "stat-change";
      side: BattleSideId;
      pokemonId: string;
      stat: keyof StatStages;
      stages: number;
      newStage: number;
    }
  | { type: "status-applied"; side: BattleSideId; pokemonId: string; status: NonVolatileStatus }
  | { type: "status-cured"; side: BattleSideId; pokemonId: string; status: NonVolatileStatus }
  | {
      type: "secondary-damage";
      side: BattleSideId;
      pokemonId: string;
      amount: number;
      remainingHp: number;
      cause: SecondaryDamageCause;
    }
  | { type: "heal"; side: BattleSideId; pokemonId: string; amount: number; remainingHp: number; cause: HealCause }
  | { type: "item-consumed"; side: BattleSideId; pokemonId: string; itemId: string }
  | { type: "weather-changed"; weather: WeatherId }
  | { type: "terrain-changed"; terrain: TerrainId }
  | { type: "hazard-set"; side: BattleSideId; hazard: HazardId }
  | {
      type: "form-change";
      side: BattleSideId;
      pokemonId: string;
      /** The new form id, or undefined when reverting to the base form. */
      form?: string;
      cause: Exclude<BattleMechanic, "z-move"> | "revert";
    }
  | { type: "z-move-used"; side: BattleSideId; pokemonId: string; moveId: string }
  | { type: "switch-out"; side: BattleSideId; pokemonId: string }
  | { type: "switch-in"; side: BattleSideId; pokemonId: string }
  | { type: "turn-end"; turn: number }
  | { type: "battle-end"; winner?: BattleSideId };
