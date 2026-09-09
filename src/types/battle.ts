import type { BattleMechanic } from "./mechanics";
import type { Pokemon, StatStages } from "./pokemon";

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
// Phase 2: BattleState, sides, actions, phases, and events.
// Weather/terrain/hazards/side-effects are structurally present (BattleState needs
// somewhere to hold them) but inert until the Phase 3 WeatherEngine/EffectEngine exist —
// TurnEngine initializes them to "none"/empty and never mutates them yet.
// ---------------------------------------------------------------------------

export type WeatherState = {
  id: WeatherId;
  turnsRemaining: number;
};

export type TerrainState = {
  id: TerrainId;
  turnsRemaining: number;
};

/** Entry hazards laid on one side of the field (Stealth Rock, Spikes, etc). Inert until Phase 3. */
export type Hazards = {
  stealthRock: boolean;
  spikes: number;
  toxicSpikes: number;
  stickyWeb: boolean;
};

export function createDefaultHazards(): Hazards {
  return { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false };
}

/** A timed side-wide effect such as Reflect, Light Screen, or Tailwind. Inert until Phase 3. */
export type SideEffect = {
  id: string;
  turnsRemaining: number;
};

/** Field-wide effects such as Trick Room or Gravity that aren't tied to either side. Inert until Phase 3. */
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

export type BattleSide = {
  team: Pokemon[];
  activePokemonIndex: number;
  hazards: Hazards;
  sideEffects: SideEffect[];
};

export function createBattleSide(team: Pokemon[]): BattleSide {
  return {
    team,
    activePokemonIndex: 0,
    hazards: createDefaultHazards(),
    sideEffects: [],
  };
}

export type BattleState = {
  turn: number;
  phase: BattlePhase;
  weather: WeatherState;
  terrain: TerrainState;
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
  /** Not acted on until the Phase 4 MechanicsEngine exists. */
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

export type BattleEvent =
  | { type: "turn-start"; turn: number }
  | { type: "move-used"; side: BattleSideId; pokemonId: string; moveId: string }
  | { type: "move-missed"; side: BattleSideId; pokemonId: string; moveId: string }
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
  | { type: "switch-out"; side: BattleSideId; pokemonId: string }
  | { type: "switch-in"; side: BattleSideId; pokemonId: string }
  | { type: "turn-end"; turn: number }
  | { type: "battle-end"; winner?: BattleSideId };
