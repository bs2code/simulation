"use client";

import { useCallback, useSyncExternalStore } from "react";
import { findAbility } from "@/data/abilities";
import { findItem } from "@/data/items";
import { findMove } from "@/data/moves";
import { getSpecies } from "@/data/pokemon";
import { createPokemon, type CreatePokemonConfig } from "@/utils/createPokemon";
import type { Pokemon } from "@/types/pokemon";

/**
 * Validates one saved team member against the *current* game data before anything else ever
 * reads it. Saved teams live in localStorage indefinitely, so a member saved under an older
 * version of this app's data (a renamed/removed move, ability, item, or form id) can otherwise
 * crash every page that renders it — getSpecies/getAbility/getMove all throw on an unknown id,
 * with no try/catch anywhere downstream. Dropping an invalid member here is the one place that
 * fix needs to live, rather than defensively guarding every render site that touches team data.
 */
function isValidMember(config: CreatePokemonConfig): boolean {
  let species;
  try {
    species = getSpecies(config.speciesId);
  } catch {
    return false;
  }
  if (config.form && !species.forms?.some((f) => f.id === config.form)) return false;
  if (!findAbility(config.ability)) return false;
  if (config.item && !findItem(config.item)) return false;
  return config.moveIds.length > 0 && config.moveIds.every((moveId) => findMove(moveId));
}

/** Exported for direct testing — the actual read path always runs saved data through this. */
export function sanitizeMembers(members: unknown): CreatePokemonConfig[] {
  if (!Array.isArray(members)) return [];
  return (members as CreatePokemonConfig[]).filter(
    (m) => m && typeof m === "object" && typeof m.speciesId === "string" && Array.isArray(m.moveIds) && isValidMember(m)
  );
}

// ---------------------------------------------------------------------------
// Quick Teams — named snapshots of a team's members, saved separately from the two live
// Team A/Team B slots above so a configuration (e.g. today's Team A, exact moves included) can
// be captured once and re-applied to either slot later without rebuilding it from scratch.
// ---------------------------------------------------------------------------

export type QuickTeam = {
  id: string;
  name: string;
  members: CreatePokemonConfig[];
};

const QUICK_TEAMS_KEY = "pbs:quick-teams:v1";
const EMPTY_QUICK_TEAMS: QuickTeam[] = [];

function readQuickTeamsFromStorage(): QuickTeam[] {
  if (typeof window === "undefined") return EMPTY_QUICK_TEAMS;
  try {
    const raw = window.localStorage.getItem(QUICK_TEAMS_KEY);
    if (!raw) return EMPTY_QUICK_TEAMS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY_QUICK_TEAMS;
    return (parsed as QuickTeam[])
      .filter((t) => t && typeof t.id === "string" && typeof t.name === "string")
      .map((t) => ({ ...t, members: sanitizeMembers(t.members) }));
  } catch {
    return EMPTY_QUICK_TEAMS;
  }
}

let quickTeamsCache: QuickTeam[] | undefined;
const quickTeamsListeners = new Set<() => void>();

function getCachedQuickTeams(): QuickTeam[] {
  if (!quickTeamsCache) quickTeamsCache = readQuickTeamsFromStorage();
  return quickTeamsCache;
}

function writeQuickTeams(teams: QuickTeam[]): void {
  quickTeamsCache = teams;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(QUICK_TEAMS_KEY, JSON.stringify(teams));
    } catch {
      // Private browsing / quota exceeded — the quick team just won't persist across reloads.
    }
  }
  for (const listener of quickTeamsListeners) listener();
}

/** Saves `members` as a new named Quick Team (a snapshot — later edits to the source team don't affect it). */
export function saveQuickTeam(name: string, members: CreatePokemonConfig[]): void {
  const quickTeam: QuickTeam = { id: `qt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, members };
  writeQuickTeams([...getCachedQuickTeams(), quickTeam]);
}

export function deleteQuickTeam(id: string): void {
  writeQuickTeams(getCachedQuickTeams().filter((t) => t.id !== id));
}

function subscribeQuickTeams(callback: () => void): () => void {
  quickTeamsListeners.add(callback);
  const onStorageEvent = (event: StorageEvent) => {
    if (event.key === QUICK_TEAMS_KEY) {
      quickTeamsCache = undefined;
      callback();
    }
  };
  window.addEventListener("storage", onStorageEvent);
  return () => {
    quickTeamsListeners.delete(callback);
    window.removeEventListener("storage", onStorageEvent);
  };
}

/** Reactive access to the saved Quick Teams list for client components. */
export function useQuickTeams() {
  const quickTeams = useSyncExternalStore(
    subscribeQuickTeams,
    getCachedQuickTeams,
    () => EMPTY_QUICK_TEAMS
  );
  return { quickTeams, saveQuickTeam, deleteQuickTeam };
}

export type TeamSlot = "A" | "B";

/**
 * A saved team is a *template* (species/level/nature/ability/item/moves per slot) — not a live
 * battle Pokemon. Starting a battle turns each slot into a fresh, full-HP Pokemon via
 * createPokemon(); the saved template itself never carries battle state (current HP, status,
 * stat stages), matching the engine's own Pokemon-vs-PokemonSpecies split.
 *
 * The app only ever needs two teams — Team A and Team B — so storage is two fixed slots rather
 * than a general named-team library.
 */
export type SavedTeam = {
  name: string;
  members: CreatePokemonConfig[];
};

function storageKey(slot: TeamSlot): string {
  return `pbs:team:${slot}:v1`;
}

// Fixed references (not freshly-constructed objects) so useSyncExternalStore's
// getServerSnapshot returns something referentially stable across calls — otherwise React
// treats every call as "changed" and warns about (or risks) an infinite render loop.
const DEFAULT_TEAMS: Record<TeamSlot, SavedTeam> = {
  A: { name: "Team A", members: [] },
  B: { name: "Team B", members: [] },
};

function defaultTeam(slot: TeamSlot): SavedTeam {
  return DEFAULT_TEAMS[slot];
}

function readFromStorage(slot: TeamSlot): SavedTeam {
  if (typeof window === "undefined") return defaultTeam(slot);
  try {
    const raw = window.localStorage.getItem(storageKey(slot));
    if (!raw) return defaultTeam(slot);
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as SavedTeam).members)) {
      return defaultTeam(slot);
    }
    const team = parsed as SavedTeam;
    return { ...team, members: sanitizeMembers(team.members) };
  } catch {
    return defaultTeam(slot);
  }
}

// In-memory cache keeps useSyncExternalStore's snapshot referentially stable across renders
// (it must return the same reference when nothing changed, or React will treat every call as
// a change) without re-parsing localStorage on every read.
const cache = new Map<TeamSlot, SavedTeam>();
const listeners = new Set<() => void>();

function getCached(slot: TeamSlot): SavedTeam {
  let value = cache.get(slot);
  if (!value) {
    value = readFromStorage(slot);
    cache.set(slot, value);
  }
  return value;
}

export function getTeam(slot: TeamSlot): SavedTeam {
  return getCached(slot);
}

export function saveTeamSlot(slot: TeamSlot, team: SavedTeam): void {
  cache.set(slot, team);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(storageKey(slot), JSON.stringify(team));
    } catch {
      // Private browsing / quota exceeded — the team just won't persist across reloads.
    }
  }
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorageEvent = (event: StorageEvent) => {
    if (event.key === storageKey("A") || event.key === storageKey("B")) {
      cache.clear();
      callback();
    }
  };
  window.addEventListener("storage", onStorageEvent);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorageEvent);
  };
}

export function isTeamComplete(team: SavedTeam, requiredSize: number): boolean {
  return (
    team.members.length === requiredSize &&
    team.members.every((m) => m.speciesId && m.moveIds.length > 0)
  );
}

/** Turns a saved template into fresh, full-HP battle Pokémon (one createPokemon call per slot). */
export function buildTeamFromSaved(slot: TeamSlot, team: SavedTeam): Pokemon[] {
  return team.members.map((config, index) =>
    createPokemon({ ...config, id: `${slot}-${index}-${config.speciesId}` })
  );
}

/** Reactive access to one team slot for client components, backed by localStorage. */
export function useTeamSlot(slot: TeamSlot) {
  const team = useSyncExternalStore(
    subscribe,
    () => getCached(slot),
    () => defaultTeam(slot)
  );
  const save = useCallback((next: SavedTeam) => saveTeamSlot(slot, next), [slot]);
  return { team, loaded: true, save };
}
