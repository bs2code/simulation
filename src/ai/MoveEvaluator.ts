import { DamageEngine } from "@/engine/DamageEngine";
import type { Move, MoveCategory } from "@/types/moves";
import type { Pokemon } from "@/types/pokemon";
import { SeededRNG } from "@/utils/rng";

/** A representative damage roll used for AI estimation — the actual battle RNG is never touched. */
const ESTIMATE_RANDOM_ROLL = 92;

const LETHAL_SCORE_BONUS = 1000;
const PRIORITY_SCORE_WEIGHT = 20;
const SELF_BOOST_SCORE_BONUS = 15;
const STATUS_INFLICT_SCORE_BONUS = 10;
const SUPER_EFFECTIVE_SCORE_BONUS = 12;

export type MoveScore = {
  moveId: string;
  category: MoveCategory;
  priority: number;
  /** Damage estimated with a fixed, representative roll and no crit — not an actual RNG outcome. */
  expectedDamage: number;
  /** Move accuracy as a 0-1 probability (1 for moves that can't miss). */
  hitChance: number;
  effectiveness: number;
  /** True if the estimated damage alone would knock out the defender. */
  isLethal: boolean;
  hasPositiveStatChangeForSelf: boolean;
  inflictsStatus: boolean;
  /** Combined heuristic used to rank moves against each other; higher is better. */
  score: number;
};

/**
 * Estimates how good a move is against a given defender. Pure and read-only: it never mutates
 * the Pokémon it's given, and the damage numbers it produces are estimates for decision-making,
 * not real battle outcomes — TurnEngine/DamageEngine own what actually happens when a move is used.
 */
export class MoveEvaluator {
  // The estimator always supplies forceCritical/forceRandomRoll, so this RNG is never actually
  // drawn from — any seed works. A caller can still inject its own DamageEngine if it wants to
  // reuse the battle's real one, but it's not required (and estimation never mutates state either way).
  constructor(private readonly damageEngine: DamageEngine = new DamageEngine(new SeededRNG(1))) {}

  evaluateMove(attacker: Pokemon, defender: Pokemon, move: Move): MoveScore {
    const hitChance = move.accuracy !== undefined ? move.accuracy / 100 : 1;

    let expectedDamage = 0;
    let effectiveness = 1;
    if (move.category !== "status" && move.power) {
      const result = this.damageEngine.calculateDamage(attacker, defender, move, {
        forceCritical: false,
        forceRandomRoll: ESTIMATE_RANDOM_ROLL,
      });
      expectedDamage = result.damage;
      effectiveness = result.effectiveness;
    }

    const isLethal = expectedDamage > 0 && expectedDamage >= defender.currentHp;
    const hasPositiveStatChangeForSelf = move.effects.some(
      (e) => e.kind === "stat-change" && e.target === "self" && e.stages > 0
    );
    const inflictsStatus = move.effects.some(
      (e) => e.kind === "status" && e.target === "opponent" && defender.status.condition === "none"
    );

    let score = expectedDamage * hitChance;
    if (isLethal) score += LETHAL_SCORE_BONUS;
    score += move.priority * PRIORITY_SCORE_WEIGHT;
    if (hasPositiveStatChangeForSelf) score += SELF_BOOST_SCORE_BONUS;
    if (inflictsStatus) score += STATUS_INFLICT_SCORE_BONUS;
    if (effectiveness >= 2) score += SUPER_EFFECTIVE_SCORE_BONUS;

    return {
      moveId: move.id,
      category: move.category,
      priority: move.priority,
      expectedDamage,
      hitChance,
      effectiveness,
      isLethal,
      hasPositiveStatChangeForSelf,
      inflictsStatus,
      score,
    };
  }

  /** Evaluates every move and returns them best-first. */
  rankMoves(attacker: Pokemon, defender: Pokemon, moves: Move[]): MoveScore[] {
    return moves
      .map((move) => this.evaluateMove(attacker, defender, move))
      .sort((a, b) => b.score - a.score);
  }
}
