import { otherSide, type BattleSideId, type BattleState } from "@/types/battle";

export type BattleStats = {
  damageDealtByPokemon: Record<string, number>;
  koCountByPokemon: Record<string, number>;
  /** Total direct move damage dealt BY each side (not damage taken). */
  totalDamageDealtBySide: Record<BattleSideId, number>;
  /** The Pokémon with the most KOs, tie-broken by damage dealt. Undefined if nothing happened. */
  mvpPokemonId?: string;
};

/**
 * Finds who most recently used a move before `beforeIndex` in the log, stopping at the start
 * of the current turn — used to attribute a "damage" or "fainted" event to its attacker, since
 * those events only record the side/Pokémon on the receiving end.
 */
function findAttackerId(state: BattleState, beforeIndex: number): string | undefined {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const event = state.log[i];
    if (event.type === "move-used") return event.pokemonId;
    if (event.type === "turn-start") return undefined;
  }
  return undefined;
}

/** Summarizes a finished battle's event log: who dealt damage, who scored KOs, and the MVP. */
export function computeBattleStats(state: BattleState): BattleStats {
  const damageDealtByPokemon: Record<string, number> = {};
  const koCountByPokemon: Record<string, number> = {};
  const totalDamageDealtBySide: Record<BattleSideId, number> = { player: 0, opponent: 0 };

  state.log.forEach((event, index) => {
    if (event.type === "damage") {
      const dealingSide = otherSide(event.side);
      totalDamageDealtBySide[dealingSide] += event.amount;

      const attackerId = findAttackerId(state, index);
      if (attackerId) {
        damageDealtByPokemon[attackerId] = (damageDealtByPokemon[attackerId] ?? 0) + event.amount;
      }
    }

    if (event.type === "fainted") {
      const attackerId = findAttackerId(state, index);
      if (attackerId) {
        koCountByPokemon[attackerId] = (koCountByPokemon[attackerId] ?? 0) + 1;
      }
    }
  });

  let mvpPokemonId: string | undefined;
  let bestKo = -1;
  let bestDamage = -1;
  const candidateIds = new Set([...Object.keys(koCountByPokemon), ...Object.keys(damageDealtByPokemon)]);
  for (const pokemonId of candidateIds) {
    const ko = koCountByPokemon[pokemonId] ?? 0;
    const damage = damageDealtByPokemon[pokemonId] ?? 0;
    if (ko > bestKo || (ko === bestKo && damage > bestDamage)) {
      bestKo = ko;
      bestDamage = damage;
      mvpPokemonId = pokemonId;
    }
  }

  return { damageDealtByPokemon, koCountByPokemon, totalDamageDealtBySide, mvpPokemonId };
}
