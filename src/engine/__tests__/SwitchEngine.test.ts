import { describe, expect, it } from "vitest";
import {
  findTeamIndexByPokemonId,
  getSidesNeedingForcedSwitch,
  hasSideLost,
  isValidSwitchTarget,
  performSwitch,
  sideNeedsForcedSwitch,
} from "../SwitchEngine";
import { createBattleSide } from "@/types/battle";
import { STANDARD_RULES } from "@/types/rules";
import { buildPokemon } from "./testHelpers";

describe("SwitchEngine", () => {
  it("finds a team member's index by id", () => {
    const a = buildPokemon("a", "charizard", ["ember"]);
    const b = buildPokemon("b", "blastoise", ["tackle"]);
    const side = createBattleSide([a, b]);
    expect(findTeamIndexByPokemonId(side, b.id)).toBe(1);
    expect(findTeamIndexByPokemonId(side, "nonexistent")).toBe(-1);
  });

  it("rejects switching into the active slot, an out-of-range index, or a fainted Pokémon", () => {
    const a = buildPokemon("a", "charizard", ["ember"]);
    const b = buildPokemon("b", "blastoise", ["tackle"]);
    b.fainted = true;
    const side = createBattleSide([a, b]);

    expect(isValidSwitchTarget(side, 0)).toBe(false); // currently active
    expect(isValidSwitchTarget(side, 1)).toBe(false); // fainted
    expect(isValidSwitchTarget(side, 5)).toBe(false); // out of range
  });

  it("allows switching into a healthy benched Pokémon", () => {
    const a = buildPokemon("a", "charizard", ["ember"]);
    const b = buildPokemon("b", "blastoise", ["tackle"]);
    const side = createBattleSide([a, b]);
    expect(isValidSwitchTarget(side, 1)).toBe(true);
  });

  it("performSwitch updates activePokemonIndex and emits switch-out/switch-in events", () => {
    const a = buildPokemon("a", "charizard", ["ember"]);
    const b = buildPokemon("b", "blastoise", ["tackle"]);
    const side = createBattleSide([a, b]);

    const events = performSwitch(side, "player", 1);
    expect(side.activePokemonIndex).toBe(1);
    expect(events).toEqual([
      { type: "switch-out", side: "player", pokemonId: a.id },
      { type: "switch-in", side: "player", pokemonId: b.id },
    ]);
  });

  it("performSwitch omits switch-out when there is no healthy outgoing Pokémon (e.g. it just fainted)", () => {
    const a = buildPokemon("a", "charizard", ["ember"]);
    a.fainted = true;
    const b = buildPokemon("b", "blastoise", ["tackle"]);
    const side = createBattleSide([a, b]);

    const events = performSwitch(side, "player", 1);
    expect(events).toEqual([{ type: "switch-in", side: "player", pokemonId: b.id }]);
  });

  it("sideNeedsForcedSwitch is true only when the active Pokémon fainted and a replacement exists", () => {
    const a = buildPokemon("a", "charizard", ["ember"]);
    const b = buildPokemon("b", "blastoise", ["tackle"]);
    const side = createBattleSide([a, b]);
    expect(sideNeedsForcedSwitch(side)).toBe(false);

    a.fainted = true;
    expect(sideNeedsForcedSwitch(side)).toBe(true);

    b.fainted = true;
    expect(sideNeedsForcedSwitch(side)).toBe(false); // no one left to switch to
  });

  it("hasSideLost is true only when every team member has fainted", () => {
    const a = buildPokemon("a", "charizard", ["ember"]);
    const b = buildPokemon("b", "blastoise", ["tackle"]);
    const side = createBattleSide([a, b]);
    expect(hasSideLost(side)).toBe(false);

    a.fainted = true;
    expect(hasSideLost(side)).toBe(false);

    b.fainted = true;
    expect(hasSideLost(side)).toBe(true);
  });

  it("getSidesNeedingForcedSwitch inspects both sides of a BattleState", () => {
    const player = createBattleSide([buildPokemon("p1", "charizard", ["ember"])]);
    const opponent = createBattleSide([
      buildPokemon("o1", "blastoise", ["tackle"]),
      buildPokemon("o2", "pikachu", ["tackle"]),
    ]);
    opponent.team[0].fainted = true;

    const state = {
      turn: 1,
      phase: "switching" as const,
      weather: { id: "none" as const, turnsRemaining: 0 },
      terrain: { id: "none" as const, turnsRemaining: 0 },
      rules: STANDARD_RULES,
      sides: { player, opponent },
      field: { activeEffects: [] },
      log: [],
    };

    expect(getSidesNeedingForcedSwitch(state)).toEqual(["opponent"]);
  });
});
