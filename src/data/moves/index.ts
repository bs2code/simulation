import type { Move } from "@/types/moves";
import { MOVE_LIST } from "./moveList";

const MOVES_BY_ID: Map<string, Move> = new Map(MOVE_LIST.map((move) => [move.id, move]));

export function getMove(moveId: string): Move {
  const move = MOVES_BY_ID.get(moveId);
  if (!move) {
    throw new Error(`Unknown move id: ${moveId}`);
  }
  return move;
}

export function getAllMoves(): Move[] {
  return MOVE_LIST;
}

export { MOVE_LIST };
