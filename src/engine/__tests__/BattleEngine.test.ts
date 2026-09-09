import { describe, expect, it } from "vitest";
import { BattleEngine } from "../BattleEngine";
import { SeededRNG } from "@/utils/rng";
import type { BattleState, BattleSideId } from "@/types/battle";
import { buildFullTeam, buildPokemon } from "./testHelpers";

/**
 * Naive auto-play used only to exercise the engine end-to-end: each side always uses
 * whichever of its moves still has PP, and forced switches send in the first healthy
 * benched Pokémon. This is not the real BattleAI (Phase 5) — it exists purely to drive
 * a full 6v6 battle to completion for testing.
 */
function playToCompletion(engine: BattleEngine, initial: BattleState): BattleState {
  let state = initial;
  let iterations = 0;
  const MAX_ITERATIONS = 500;

  while (state.phase !== "ended" && iterations < MAX_ITERATIONS) {
    iterations++;

    if (state.phase === "switching") {
      for (const side of engine.getSidesNeedingSwitch(state)) {
        const teamSide = state.sides[side];
        const replacement = teamSide.team.find((p) => !p.fainted);
        if (!replacement) continue;
        state = engine.resolveForcedSwitch(state, side, replacement.id);
      }
      continue;
    }

    const playerActive = state.sides.player.team[state.sides.player.activePokemonIndex];
    const opponentActive = state.sides.opponent.team[state.sides.opponent.activePokemonIndex];
    const playerMove = playerActive.moves.find((m) => m.currentPP > 0);
    const opponentMove = opponentActive.moves.find((m) => m.currentPP > 0);
    if (!playerMove || !opponentMove) {
      throw new Error("Ran out of PP before the battle concluded — test fixture needs more PP");
    }

    state = engine.submitTurn(
      state,
      { type: "move", pokemonId: playerActive.id, moveId: playerMove.moveId },
      { type: "move", pokemonId: opponentActive.id, moveId: opponentMove.moveId }
    );
  }

  if (iterations >= MAX_ITERATIONS) {
    throw new Error("Battle did not conclude within the iteration budget");
  }
  return state;
}

describe("BattleEngine full 6v6 battle", () => {
  it("runs a complete 6v6 battle to a single winner, fainting Pokémon and forcing switches along the way", () => {
    const rng = new SeededRNG(2026);
    const engine = new BattleEngine(rng);
    const teamA = buildFullTeam("A");
    const teamB = buildFullTeam("B");
    const state = engine.createBattle(teamA, teamB);

    const final = playToCompletion(engine, state);

    expect(final.phase).toBe("ended");
    expect(["player", "opponent", undefined]).toContain(final.winner);

    const loser: BattleSideId | undefined =
      final.winner === "player" ? "opponent" : final.winner === "opponent" ? "player" : undefined;
    if (loser) {
      expect(final.sides[loser].team.every((p) => p.fainted)).toBe(true);
      const winnerSide = loser === "player" ? "opponent" : "player";
      expect(final.sides[winnerSide].team.some((p) => !p.fainted)).toBe(true);
    }

    // The battle should actually have gone through multiple fainting/switching cycles,
    // not just been decided on turn 1.
    expect(final.turn).toBeGreaterThan(1);
    expect(final.log.filter((e) => e.type === "fainted").length).toBeGreaterThan(0);
    expect(final.log.some((e) => e.type === "battle-end")).toBe(true);
  });

  it("battles between the same two seeds produce the exact same outcome (deterministic replay)", () => {
    const runOnce = () => {
      const rng = new SeededRNG(555);
      const engine = new BattleEngine(rng);
      const state = engine.createBattle(buildFullTeam("A"), buildFullTeam("B"));
      return playToCompletion(engine, state);
    };

    const resultA = runOnce();
    const resultB = runOnce();

    expect(resultA.winner).toBe(resultB.winner);
    expect(resultA.turn).toBe(resultB.turn);
    expect(resultA.log).toEqual(resultB.log);
  });

  it("rejects creating a battle with an empty team", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const team = [buildPokemon("a", "charizard", ["ember"])];
    expect(() => engine.createBattle([], team)).toThrow(/at least one/);
  });
});
