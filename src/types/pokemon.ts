import type { BattleMove } from "./moves";

/** The 18 canonical Pokémon types. */
export type PokemonType =
  | "Normal"
  | "Fire"
  | "Water"
  | "Electric"
  | "Grass"
  | "Ice"
  | "Fighting"
  | "Poison"
  | "Ground"
  | "Flying"
  | "Psychic"
  | "Bug"
  | "Rock"
  | "Ghost"
  | "Dragon"
  | "Dark"
  | "Steel"
  | "Fairy";

export const NATURES = [
  "Hardy",
  "Lonely",
  "Brave",
  "Adamant",
  "Naughty",
  "Bold",
  "Docile",
  "Relaxed",
  "Impish",
  "Lax",
  "Timid",
  "Hasty",
  "Serious",
  "Jolly",
  "Naive",
  "Modest",
  "Mild",
  "Quiet",
  "Bashful",
  "Rash",
  "Calm",
  "Gentle",
  "Sassy",
  "Careful",
  "Quirky",
] as const;

/** A nature boosts one non-HP stat by 10% and lowers another by 10%. Neutral natures affect neither. */
export type Nature = (typeof NATURES)[number];

/** The six core battle stats. HP is included for calculated-stat purposes; it has no stat stage. */
export type Stats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

/** Non-HP stats plus accuracy/evasion, each stageable from -6 to +6. */
export type StatStages = {
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  accuracy: number;
  evasion: number;
};

export type NonVolatileStatus =
  | "none"
  | "burn"
  | "freeze"
  | "paralysis"
  | "poison"
  | "badly-poisoned"
  | "sleep";

/** The single major status condition a Pokémon can hold at a time. */
export type StatusCondition = {
  condition: NonVolatileStatus;
  /** Turns remaining for statuses like sleep; toxic counter for badly-poisoned. */
  counter?: number;
};

/** Volatile statuses clear on switch-out (e.g. confusion, flinch, leech seed). */
export type VolatileStatusId =
  | "confusion"
  | "flinch"
  | "leech-seed"
  | "infatuation"
  | "substitute"
  | "taunt"
  | "encore"
  | "protect";

export type VolatileStatus = {
  id: VolatileStatusId;
  turnsRemaining?: number;
  data?: Record<string, unknown>;
};

/** Tracks one-time-per-battle mechanic usage/activation for a single Pokémon instance. */
export type MechanicState = {
  megaEvolved: boolean;
  gigantamaxed: boolean;
  dynamaxTurnsRemaining: number;
  zMoveUsed: boolean;
  battleBondActivated: boolean;
};

export function createDefaultMechanicState(): MechanicState {
  return {
    megaEvolved: false,
    gigantamaxed: false,
    dynamaxTurnsRemaining: 0,
    zMoveUsed: false,
    battleBondActivated: false,
  };
}

export function createDefaultStatStages(): StatStages {
  return {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
  };
}

export function createDefaultStatus(): StatusCondition {
  return { condition: "none" };
}

/** An alternate form of a species (regional form, mega, gigantamax, etc). */
export type PokemonForm = {
  id: string;
  name: string;
  types: PokemonType[];
  baseStats: Stats;
  abilities: string[];
  /** Move ids this form can legally learn, if different from the base species' (regional forms only — e.g. Hisuian Arcanine's own movepool includes Head Smash). Falls back to the species' `moves` when omitted. */
  moves?: string[];
  /** e.g. "mega", "gigantamax", "regional" — used by the mechanics engine to gate access. */
  formCategory:
    | "mega"
    | "gigantamax"
    | "regional"
    | "alolan"
    | "galarian"
    | "hisuian"
    | "paldean"
    | "battle-bond"
    | "primal"
    | "crowned"
    | "origin"
    | "alternate"
    | "other";
  /** Item id the holder must have equipped to transform into this form (e.g. a Mega Stone). Omitted for forms that don't need one (Gigantamax, Battle Bond, or a move-gated Mega like Rayquaza). */
  requiredItem?: string;
  /** Move id the holder must know to transform into this form instead of a held item (Mega Rayquaza only, via Dragon Ascent). Mutually exclusive with `requiredItem`. */
  requiredMove?: string;
  /**
   * True for forms that aren't chosen via a BattleMechanic at all — in the real games they're
   * simply whichever form the Pokémon takes the instant it's sent into battle, based on its
   * held item (Primal Reversion, Zacian/Zamazenta's Crowned formes, Giratina's Origin Forme).
   * Requires `requiredItem`; checked automatically on every switch-in, not offered as a toggle.
   */
  autoOnSwitchIn?: boolean;
};

/** Species-level, immutable Pokédex data. Never holds battle state. */
export type PokemonSpecies = {
  id: string;
  name: string;
  types: PokemonType[];
  baseStats: Stats;
  abilities: string[];
  /** Move IDs this species can legally learn. */
  moves: string[];
  forms?: PokemonForm[];
};

/** Individual values (0-31) and effort values (0-252 per stat, 510 total) used in stat calculation. */
export type IVs = Stats;
export type EVs = Stats;

export const DEFAULT_IVS: IVs = {
  hp: 31,
  attack: 31,
  defense: 31,
  specialAttack: 31,
  specialDefense: 31,
  speed: 31,
};

export const DEFAULT_EVS: EVs = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

/** A single Pokémon instance participating in (or built for) a battle. */
export type Pokemon = {
  id: string;
  speciesId: string;
  nickname?: string;
  level: number;
  nature: Nature;
  ability: string;
  item?: string;
  moves: BattleMove[];
  ivs: IVs;
  evs: EVs;
  stats: Stats;
  currentHp: number;
  status: StatusCondition;
  statStages: StatStages;
  volatileStatuses: VolatileStatus[];
  fainted: boolean;
  form?: string;
  mechanicState: MechanicState;
  /** Set by a Choice item the first time its holder uses a move this battle; cleared on switch-out. */
  choiceLockedMoveId?: string;
};
