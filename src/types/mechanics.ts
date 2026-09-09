/**
 * Battle mechanics (Mega Evolution, Z-Moves, Gigantamax, Battle Bond) are Phase 4 work.
 * The type lives here now only so BattleAction's optional `mechanic` field has something
 * to point at — MechanicsEngine and real activation logic don't exist yet.
 */
export type BattleMechanic = "mega" | "z-move" | "gigantamax" | "battle-bond";
