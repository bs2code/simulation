import { describe, expect, it } from "vitest";
import {
  activateMechanic,
  activateZMove,
  canActivateMechanic,
  getZMoveVariant,
  tickMechanicDurations,
  tryAutoActivateBattleBond,
} from "../MechanicsEngine";
import { BattleEngine } from "../BattleEngine";
import { createBattleSide } from "@/types/battle";
import { STANDARD_RULES } from "@/types/rules";
import { getMove } from "@/data/moves";
import { SeededRNG } from "@/utils/rng";
import { buildPokemon } from "./testHelpers";

describe("canActivateMechanic: mega evolution", () => {
  it("requires the matching Mega Stone", () => {
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"]);
    const side = createBattleSide([lucario]);
    expect(canActivateMechanic(lucario, side, "mega", STANDARD_RULES).ok).toBe(false);
  });

  it("succeeds once the right Mega Stone is held", () => {
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"], 50, { item: "lucarionite" });
    const side = createBattleSide([lucario]);
    expect(canActivateMechanic(lucario, side, "mega", STANDARD_RULES)).toEqual({ ok: true });
  });

  it("Rayquaza mega-evolves by knowing Dragon Ascent instead of a held item", () => {
    const rayquazaWithoutMove = buildPokemon("rayquaza", "rayquaza", ["dragon-claw"]);
    const sideWithoutMove = createBattleSide([rayquazaWithoutMove]);
    expect(canActivateMechanic(rayquazaWithoutMove, sideWithoutMove, "mega", STANDARD_RULES).ok).toBe(false);

    const rayquazaWithMove = buildPokemon("rayquaza", "rayquaza", ["dragon-ascent"]);
    const sideWithMove = createBattleSide([rayquazaWithMove]);
    expect(canActivateMechanic(rayquazaWithMove, sideWithMove, "mega", STANDARD_RULES)).toEqual({ ok: true });
  });

  it("the wrong Mega Stone doesn't unlock a different species' Mega Evolution", () => {
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"], 50, { item: "galladite" });
    const side = createBattleSide([lucario]);
    expect(canActivateMechanic(lucario, side, "mega", STANDARD_RULES).ok).toBe(false);
  });

  it("is disabled once the ruleset forbids Mega Evolution", () => {
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"], 50, { item: "lucarionite" });
    const side = createBattleSide([lucario]);
    const rules = { ...STANDARD_RULES, allowMegaEvolution: false };
    expect(canActivateMechanic(lucario, side, "mega", rules)).toEqual({
      ok: false,
      reason: "Mega Evolution is disabled by the ruleset",
    });
  });

  it("cannot activate twice for the same Pokémon in one battle", () => {
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"], 50, { item: "lucarionite" });
    const side = createBattleSide([lucario]);
    activateMechanic(lucario, side, "player", "mega");
    expect(canActivateMechanic(lucario, side, "mega", STANDARD_RULES).ok).toBe(false);
  });

  it("respects a custom maxMegaUsesPerBattle even across different Pokémon on the same side", () => {
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"], 50, { item: "lucarionite" });
    const gallade = buildPokemon("gallade", "gallade", ["close-combat"], 50, { item: "galladite" });
    const side = createBattleSide([lucario, gallade]);
    activateMechanic(lucario, side, "player", "mega");
    expect(canActivateMechanic(gallade, side, "mega", STANDARD_RULES)).toEqual({
      ok: false,
      reason: "Mega Evolution has already been used the maximum number of times this battle",
    });
  });
});

describe("activateMechanic: mega evolution", () => {
  it("changes the Pokémon's form, types (via species lookup), and stats, preserving HP percentage", () => {
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"], 50, { item: "lucarionite" });
    lucario.currentHp = Math.floor(lucario.stats.hp / 2);
    const side = createBattleSide([lucario]);
    const hpRatioBefore = lucario.currentHp / lucario.stats.hp;

    const event = activateMechanic(lucario, side, "player", "mega");

    expect(lucario.form).toBe("mega-lucario");
    expect(lucario.mechanicState.megaEvolved).toBe(true);
    expect(side.mechanicUsage.mega).toBe(1);
    expect(lucario.stats.attack).toBeGreaterThan(110); // base Lucario Atk stat line is lower
    expect(lucario.currentHp / lucario.stats.hp).toBeCloseTo(hpRatioBefore, 1);
    expect(event).toEqual({ type: "form-change", side: "player", pokemonId: lucario.id, form: "mega-lucario", cause: "mega" });
  });
});

describe("canActivateMechanic: gigantamax", () => {
  it("requires the species to have a Gigantamax form", () => {
    const lucario = buildPokemon("lucario", "lucario", ["close-combat"]);
    const side = createBattleSide([lucario]);
    expect(canActivateMechanic(lucario, side, "gigantamax", STANDARD_RULES).ok).toBe(false);
  });

  it("succeeds for a species with a Gigantamax form and no item required", () => {
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"]);
    const side = createBattleSide([charizard]);
    expect(canActivateMechanic(charizard, side, "gigantamax", STANDARD_RULES)).toEqual({ ok: true });
  });
});

describe("activateMechanic: gigantamax", () => {
  it("doubles max HP while preserving HP percentage, and sets a 3-turn duration", () => {
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"]);
    const maxHpBefore = charizard.stats.hp;
    charizard.currentHp = Math.floor(maxHpBefore / 2);
    const side = createBattleSide([charizard]);

    activateMechanic(charizard, side, "player", "gigantamax");

    expect(charizard.stats.hp).toBe(maxHpBefore * 2);
    // ~50% of the new doubled max HP, modulo integer rounding.
    expect(Math.abs(charizard.currentHp - maxHpBefore)).toBeLessThanOrEqual(1);
    expect(charizard.mechanicState.gigantamaxed).toBe(true);
    expect(charizard.mechanicState.dynamaxTurnsRemaining).toBe(3);
    expect(charizard.form).toBe("gigantamax-charizard");
  });
});

describe("tickMechanicDurations", () => {
  it("reverts a Gigantamax Pokémon back to base form once its duration expires", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"]);
    const state = engine.createBattle([charizard], [buildPokemon("b", "blastoise", ["tackle"])]);
    const side = state.sides.player;
    const pokemon = side.team[0];

    activateMechanic(pokemon, side, "player", "gigantamax");
    const maxHpGmax = pokemon.stats.hp;

    tickMechanicDurations(state); // turn 1: 3 -> 2
    tickMechanicDurations(state); // turn 2: 2 -> 1
    expect(pokemon.mechanicState.gigantamaxed).toBe(true);
    const events = tickMechanicDurations(state); // turn 3: 1 -> 0, reverts

    expect(pokemon.mechanicState.gigantamaxed).toBe(false);
    expect(pokemon.form).toBeUndefined();
    expect(pokemon.stats.hp).toBe(maxHpGmax / 2);
    expect(events).toEqual([
      { type: "form-change", side: "player", pokemonId: pokemon.id, form: undefined, cause: "revert" },
    ]);
  });
});

describe("Z-Moves", () => {
  it("requires a Z-Crystal to activate", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"]);
    const side = createBattleSide([pikachu]);
    expect(canActivateMechanic(pikachu, side, "z-move", STANDARD_RULES).ok).toBe(false);
  });

  it("succeeds once holding a Z-Crystal, and activateZMove marks it used", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"], 50, { item: "z-crystal" });
    const side = createBattleSide([pikachu]);
    expect(canActivateMechanic(pikachu, side, "z-move", STANDARD_RULES)).toEqual({ ok: true });

    activateZMove(pikachu, side);
    expect(pikachu.mechanicState.zMoveUsed).toBe(true);
    expect(side.mechanicUsage.zMove).toBe(1);
    expect(canActivateMechanic(pikachu, side, "z-move", STANDARD_RULES).ok).toBe(false);
  });

  it("getZMoveVariant boosts a damaging move's power and removes its accuracy check", () => {
    const thunderbolt = getMove("thunderbolt");
    const zVariant = getZMoveVariant(thunderbolt);
    expect(zVariant.power).toBeGreaterThan(thunderbolt.power!);
    expect(zVariant.accuracy).toBeUndefined();
    expect(zVariant.type).toBe(thunderbolt.type);
  });

  it("getZMoveVariant leaves status moves unchanged", () => {
    const growl = getMove("growl");
    expect(getZMoveVariant(growl)).toBe(growl);
  });

  it("caps Z-Move power at 200", () => {
    const closeCombat = getMove("close-combat"); // power 120 * 1.5 = 180, still under cap
    const hydroPump = getMove("hydro-pump"); // power 110 * 1.5 = 165
    expect(getZMoveVariant(closeCombat).power).toBeLessThanOrEqual(200);
    expect(getZMoveVariant(hydroPump).power).toBeLessThanOrEqual(200);
  });
});

describe("Battle Bond auto-activation", () => {
  it("activates automatically the first time a Battle Bond Greninja KOs an opponent", () => {
    const greninja = buildPokemon("greninja", "greninja", ["hydro-pump"], 50, { ability: "battle-bond" });
    const side = createBattleSide([greninja]);
    const event = tryAutoActivateBattleBond(greninja, side, "player", STANDARD_RULES);

    expect(event).toEqual({
      type: "form-change",
      side: "player",
      pokemonId: greninja.id,
      form: "ash-greninja",
      cause: "battle-bond",
    });
    expect(greninja.form).toBe("ash-greninja");
    expect(greninja.mechanicState.battleBondActivated).toBe(true);
  });

  it("does not re-activate a second time", () => {
    const greninja = buildPokemon("greninja", "greninja", ["hydro-pump"], 50, { ability: "battle-bond" });
    const side = createBattleSide([greninja]);
    tryAutoActivateBattleBond(greninja, side, "player", STANDARD_RULES);
    const secondEvent = tryAutoActivateBattleBond(greninja, side, "player", STANDARD_RULES);
    expect(secondEvent).toBeUndefined();
  });

  it("does not activate for a Pokémon without the Battle Bond ability", () => {
    const greninja = buildPokemon("greninja", "greninja", ["hydro-pump"], 50, { ability: "torrent" });
    const side = createBattleSide([greninja]);
    expect(tryAutoActivateBattleBond(greninja, side, "player", STANDARD_RULES)).toBeUndefined();
  });
});
