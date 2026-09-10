import type { Move } from "@/types/moves";
import generatedMovesData from "./generated/moves.generated.json";
import { MOVE_LIST } from "./moveList";

/**
 * Bulk-generated moves (accurate type/power/accuracy/category/priority/PP/flags for ~900 real
 * moves — see scripts/generate-pokedex.ts) merged with the hand-curated set that has real
 * MoveEffect behavior. Curated entries always win on id collision, so e.g. "thunderbolt" keeps
 * its real paralysis-chance effect instead of being overwritten by the generated bare version.
 */
const GENERATED_MOVES = generatedMovesData as Move[];

const MOVES_BY_ID: Map<string, Move> = new Map([
  ...GENERATED_MOVES.map((move): [string, Move] => [move.id, move]),
  ...MOVE_LIST.map((move): [string, Move] => [move.id, move]),
]);

const ALL_MOVES: Move[] = Array.from(MOVES_BY_ID.values());

export function getMove(moveId: string): Move {
  const move = MOVES_BY_ID.get(moveId);
  if (!move) {
    throw new Error(`Unknown move id: ${moveId}`);
  }
  return move;
}

export function getAllMoves(): Move[] {
  return ALL_MOVES;
}

/** The hand-curated set only (has real MoveEffect behavior). */
export { MOVE_LIST };
