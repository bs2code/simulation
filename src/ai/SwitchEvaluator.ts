import { getMove } from "@/data/moves";
import { getTypeMultiplier } from "@/data/types/typeChart";
import { getAbilityTypeImmunities } from "@/engine/AbilityEngine";
import type { BattleSide } from "@/types/battle";
import type { Pokemon, PokemonType } from "@/types/pokemon";
import { getPokemonTypes } from "@/utils/pokemonTypes";

export type SwitchScore = {
  pokemonId: string;
  teamIndex: number;
  /** The strongest type-effectiveness multiplier an opponent could hit this candidate with (lower is safer). */
  worstIncomingMultiplier: number;
  /** The strongest type-effectiveness multiplier this candidate could hit the opponent with (higher is better). */
  bestOutgoingMultiplier: number;
  hpFraction: number;
  score: number;
};

function uniqueMoveTypes(pokemon: Pokemon): PokemonType[] {
  const types = pokemon.moves.map((m) => getMove(m.moveId).type);
  return Array.from(new Set(types));
}

/** The highest type-effectiveness multiplier any of `attackerTypes` moves would have against `defender`. */
function bestMultiplierAgainst(attackerTypes: PokemonType[], defender: Pokemon): number {
  const defenderTypes = getPokemonTypes(defender);
  const immunities = getAbilityTypeImmunities(defender);
  const multipliers = attackerTypes.map((type) =>
    immunities.includes(type) ? 0 : getTypeMultiplier(type, defenderTypes)
  );
  return multipliers.length > 0 ? Math.max(...multipliers) : 1;
}

const OUTGOING_WEIGHT = 20;
const INCOMING_WEIGHT = 25;
const HP_WEIGHT = 15;
const HEALTHY_STATUS_BONUS = 5;

function scoreCandidate(
  candidate: Pokemon,
  worstIncomingMultiplier: number,
  bestOutgoingMultiplier: number
): number {
  const hpFraction = candidate.currentHp / candidate.stats.hp;
  let score = bestOutgoingMultiplier * OUTGOING_WEIGHT - worstIncomingMultiplier * INCOMING_WEIGHT;
  score += hpFraction * HP_WEIGHT;
  if (candidate.status.condition === "none") score += HEALTHY_STATUS_BONUS;
  return score;
}

function benchedCandidates(side: BattleSide): { pokemon: Pokemon; teamIndex: number }[] {
  return side.team
    .map((pokemon, teamIndex) => ({ pokemon, teamIndex }))
    .filter(({ pokemon, teamIndex }) => !pokemon.fainted && teamIndex !== side.activePokemonIndex);
}

/**
 * Estimates how good each benched Pokémon would be as a switch-in. Pure and read-only — it
 * never mutates a Pokémon, and both methods here just differ in how much of the opponent's
 * team they weigh: single-target for a reactive switch, whole-team for forward-looking synergy.
 */
export class SwitchEvaluator {
  /** Scores switch candidates against just the opponent's current active Pokémon. */
  evaluateSwitchOptions(side: BattleSide, opponentActive: Pokemon): SwitchScore[] {
    const opponentMoveTypes = uniqueMoveTypes(opponentActive);

    return benchedCandidates(side)
      .map(({ pokemon, teamIndex }) => {
        const candidateTypes = getPokemonTypes(pokemon);
        const immunities = getAbilityTypeImmunities(pokemon);
        const worstIncomingMultiplier = Math.max(
          0,
          ...opponentMoveTypes.map((type) => (immunities.includes(type) ? 0 : getTypeMultiplier(type, candidateTypes)))
        );
        const bestOutgoingMultiplier = bestMultiplierAgainst(uniqueMoveTypes(pokemon), opponentActive);

        return {
          pokemonId: pokemon.id,
          teamIndex,
          worstIncomingMultiplier,
          bestOutgoingMultiplier,
          hpFraction: pokemon.currentHp / pokemon.stats.hp,
          score: scoreCandidate(pokemon, worstIncomingMultiplier, bestOutgoingMultiplier),
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Scores switch candidates against the opponent's whole remaining (non-fainted) team, not just
   * their current active Pokémon — a simple stand-in for "team synergy" / forward-looking play:
   * a candidate that answers several of the opponent's remaining threats ranks above one that
   * only counters what's out right now.
   */
  evaluateSwitchOptionsAgainstTeam(side: BattleSide, opponentTeam: Pokemon[]): SwitchScore[] {
    const livingOpponents = opponentTeam.filter((p) => !p.fainted);
    if (livingOpponents.length === 0) return this.evaluateSwitchOptions(side, opponentTeam[0]);

    return benchedCandidates(side)
      .map(({ pokemon, teamIndex }) => {
        const candidateTypes = getPokemonTypes(pokemon);
        const candidateMoveTypes = uniqueMoveTypes(pokemon);
        const immunities = getAbilityTypeImmunities(pokemon);

        const incomingMultipliers = livingOpponents.map((opponent) => {
          const opponentMoveTypes = uniqueMoveTypes(opponent);
          return Math.max(
            0,
            ...opponentMoveTypes.map((type) => (immunities.includes(type) ? 0 : getTypeMultiplier(type, candidateTypes)))
          );
        });
        const outgoingMultipliers = livingOpponents.map((opponent) => bestMultiplierAgainst(candidateMoveTypes, opponent));

        const avgIncoming = incomingMultipliers.reduce((a, b) => a + b, 0) / incomingMultipliers.length;
        const avgOutgoing = outgoingMultipliers.reduce((a, b) => a + b, 0) / outgoingMultipliers.length;

        return {
          pokemonId: pokemon.id,
          teamIndex,
          worstIncomingMultiplier: avgIncoming,
          bestOutgoingMultiplier: avgOutgoing,
          hpFraction: pokemon.currentHp / pokemon.stats.hp,
          score: scoreCandidate(pokemon, avgIncoming, avgOutgoing),
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
