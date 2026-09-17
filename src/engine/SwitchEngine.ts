import type { BattleSide, BattleSideId, BattleState, BattleEvent } from "@/types/battle";

/** True if `teamIndex` is a legal switch-in target for this side right now. */
export function isValidSwitchTarget(side: BattleSide, teamIndex: number): boolean {
  if (teamIndex < 0 || teamIndex >= side.team.length) return false;
  if (teamIndex === side.activePokemonIndex) return false;
  const target = side.team[teamIndex];
  return !target.fainted;
}

export function findTeamIndexByPokemonId(side: BattleSide, pokemonId: string): number {
  return side.team.findIndex((pokemon) => pokemon.id === pokemonId);
}

/**
 * Performs a switch in place on `side` (caller is expected to have already cloned the
 * state it belongs to) and returns the events describing it. Does not validate legality —
 * callers must check `isValidSwitchTarget` first.
 */
export function performSwitch(side: BattleSide, sideId: BattleSideId, teamIndex: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  const outgoing = side.team[side.activePokemonIndex];
  if (outgoing && !outgoing.fainted) {
    outgoing.choiceLockedMoveId = undefined;
    events.push({ type: "switch-out", side: sideId, pokemonId: outgoing.id });
  }
  side.activePokemonIndex = teamIndex;
  const incoming = side.team[teamIndex];
  events.push({ type: "switch-in", side: sideId, pokemonId: incoming.id });
  return events;
}

/** A side "needs" a forced switch when its active Pokémon has fainted and a replacement exists. */
export function sideNeedsForcedSwitch(side: BattleSide): boolean {
  const active = side.team[side.activePokemonIndex];
  if (!active.fainted) return false;
  return side.team.some((pokemon) => !pokemon.fainted);
}

export function getSidesNeedingForcedSwitch(state: BattleState): BattleSideId[] {
  const needing: BattleSideId[] = [];
  if (sideNeedsForcedSwitch(state.sides.player)) needing.push("player");
  if (sideNeedsForcedSwitch(state.sides.opponent)) needing.push("opponent");
  return needing;
}

/** A side has lost when every Pokémon on its team has fainted. */
export function hasSideLost(side: BattleSide): boolean {
  return side.team.every((pokemon) => pokemon.fainted);
}
