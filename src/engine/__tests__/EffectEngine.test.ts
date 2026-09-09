import { describe, expect, it } from "vitest";
import {
  addConfusion,
  addVolatileStatus,
  applyHazardsOnSwitchIn,
  applyStatus,
  canApplyStatus,
  checkCanAct,
  processEndOfTurn,
} from "../EffectEngine";
import { BattleEngine } from "../BattleEngine";
import { createBattleSide } from "@/types/battle";
import { SeededRNG } from "@/utils/rng";
import { buildPokemon } from "./testHelpers";

describe("status immunity and application", () => {
  it("Fire-types cannot be burned", () => {
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    expect(canApplyStatus(charizard, "burn", "none")).toBe(false);
  });

  it("Electric-types cannot be paralyzed", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"]);
    expect(canApplyStatus(pikachu, "paralysis", "none")).toBe(false);
  });

  it("Poison-types cannot be poisoned", () => {
    const venusaur = buildPokemon("venusaur", "venusaur", ["vine-whip"]);
    expect(canApplyStatus(venusaur, "poison", "none")).toBe(false);
    expect(canApplyStatus(venusaur, "badly-poisoned", "none")).toBe(false);
  });

  it("a Pokémon can only hold one major status at a time", () => {
    const rng = new SeededRNG(1);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    expect(applyStatus(blastoise, "paralysis", "none", rng)).toBe(true);
    expect(applyStatus(blastoise, "burn", "none", rng)).toBe(false);
    expect(blastoise.status.condition).toBe("paralysis");
  });

  it("misty terrain blocks all major status infliction", () => {
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    expect(canApplyStatus(blastoise, "paralysis", "misty")).toBe(false);
  });

  it("electric terrain blocks sleep specifically but not other statuses", () => {
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    expect(canApplyStatus(blastoise, "sleep", "electric")).toBe(false);
    expect(canApplyStatus(blastoise, "paralysis", "electric")).toBe(true);
  });
});

describe("checkCanAct", () => {
  it("a sleeping Pokémon cannot act and its sleep counter decrements", () => {
    const rng = new SeededRNG(1);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.status = { condition: "sleep", counter: 2 };
    const result = checkCanAct(blastoise, "player", rng);
    expect(result.canAct).toBe(false);
    expect(blastoise.status.counter).toBe(1);
    expect(result.events).toEqual([
      { type: "move-prevented", side: "player", pokemonId: blastoise.id, reason: "sleep" },
    ]);
  });

  it("a Pokémon wakes up once its sleep counter reaches zero and can act that turn", () => {
    const rng = new SeededRNG(1);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.status = { condition: "sleep", counter: 1 };
    const result = checkCanAct(blastoise, "player", rng);
    expect(result.canAct).toBe(true);
    expect(blastoise.status.condition).toBe("none");
    expect(result.events).toEqual([
      { type: "status-cured", side: "player", pokemonId: blastoise.id, status: "sleep" },
    ]);
  });

  it("a flinched Pokémon cannot act, and flinch is consumed (one turn only)", () => {
    const rng = new SeededRNG(1);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    addVolatileStatus(blastoise, "flinch");
    const result = checkCanAct(blastoise, "player", rng);
    expect(result.canAct).toBe(false);
    expect(blastoise.volatileStatuses).toHaveLength(0);
  });

  it("a fully paralyzed Pokémon cannot act (RNG below the 25% threshold)", () => {
    // Seed chosen so the first random() draw is below 0.25.
    let seed = 1;
    while (new SeededRNG(seed).random() >= 0.25) seed++;
    const rng = new SeededRNG(seed);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.status = { condition: "paralysis" };
    const result = checkCanAct(blastoise, "player", rng);
    expect(result.canAct).toBe(false);
    expect(result.events[0]).toMatchObject({ type: "move-prevented", reason: "paralysis" });
  });

  it("confusion has a chance to hurt the Pokémon and prevent its move", () => {
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.volatileStatuses.push({ id: "confusion", turnsRemaining: 3 });
    const hpBefore = blastoise.currentHp;

    // Seed chosen so the self-hit roll (1/3 chance) succeeds.
    let seed = 1;
    while (new SeededRNG(seed).random() >= 1 / 3) seed++;
    const rng = new SeededRNG(seed);

    const result = checkCanAct(blastoise, "player", rng);
    expect(result.canAct).toBe(false);
    expect(blastoise.currentHp).toBeLessThan(hpBefore);
    expect(result.events.some((e) => e.type === "secondary-damage" && e.cause === "confusion")).toBe(true);
  });

  it("confusion wears off after its turn counter expires", () => {
    const rng = new SeededRNG(1);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.volatileStatuses.push({ id: "confusion", turnsRemaining: 1 });
    const result = checkCanAct(blastoise, "player", rng);
    expect(blastoise.volatileStatuses).toHaveLength(0);
    // Whether it can act this specific call depends only on fainting/other gates, which are absent here.
    expect(result.canAct).toBe(true);
  });

  it("addConfusion does not stack a second confusion volatile", () => {
    const rng = new SeededRNG(1);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    expect(addConfusion(blastoise, rng)).toBe(true);
    expect(addConfusion(blastoise, rng)).toBe(false);
    expect(blastoise.volatileStatuses.filter((v) => v.id === "confusion")).toHaveLength(1);
  });
});

describe("applyHazardsOnSwitchIn", () => {
  it("Stealth Rock damages the incoming Pokémon based on Rock-type effectiveness", () => {
    const rng = new SeededRNG(1);
    const charizard = buildPokemon("charizard", "charizard", ["ember"]); // Fire/Flying: 4x weak to Rock
    const side = createBattleSide([charizard]);
    side.hazards.stealthRock = true;

    const events = applyHazardsOnSwitchIn(side, "player", charizard, rng);
    expect(events[0]).toMatchObject({ type: "secondary-damage", cause: "stealth-rock" });
    // 4x effectiveness caps the stealth rock fraction at 50% max HP.
    expect(charizard.currentHp).toBe(charizard.stats.hp - Math.floor(charizard.stats.hp * 0.5));
  });

  it("Spikes damage a grounded Pokémon but not a Flying-type", () => {
    const rng = new SeededRNG(1);
    const charizard = buildPokemon("charizard", "charizard", ["ember"]); // Flying: immune to Spikes
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"]); // grounded
    const side = createBattleSide([charizard, pikachu]);
    side.hazards.spikes = 1;

    const charizardHpBefore = charizard.currentHp;
    applyHazardsOnSwitchIn(side, "player", charizard, rng);
    expect(charizard.currentHp).toBe(charizardHpBefore);

    const pikachuHpBefore = pikachu.currentHp;
    applyHazardsOnSwitchIn(side, "player", pikachu, rng);
    expect(pikachu.currentHp).toBeLessThan(pikachuHpBefore);
  });

  it("Toxic Spikes poisons a grounded Pokémon switching in (badly poisoned at 2 layers)", () => {
    const rng = new SeededRNG(1);
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"]);
    const side = createBattleSide([pikachu]);
    side.hazards.toxicSpikes = 2;

    const events = applyHazardsOnSwitchIn(side, "player", pikachu, rng);
    expect(pikachu.status.condition).toBe("badly-poisoned");
    expect(events.some((e) => e.type === "status-applied" && e.status === "badly-poisoned")).toBe(true);
  });

  it("Levitate exempts a Pokémon from Spikes despite being grounded by type", () => {
    const rng = new SeededRNG(1);
    // Gengar is Ghost/Poison (not Flying) but has Levitate.
    const gengar = buildPokemon("gengar", "gengar", ["shadow-ball"], 50, { ability: "levitate" });
    const side = createBattleSide([gengar]);
    side.hazards.spikes = 3;
    const hpBefore = gengar.currentHp;
    applyHazardsOnSwitchIn(side, "player", gengar, rng);
    expect(gengar.currentHp).toBe(hpBefore);
  });
});

describe("processEndOfTurn", () => {
  it("burns deal 1/16 max HP damage at end of turn", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const charizard = buildPokemon("charizard", "charizard", ["tackle"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.status = { condition: "burn" };
    const state = engine.createBattle([charizard], [blastoise]);
    // Manually invoke end-of-turn processing on this state without a full move exchange.
    const events = processEndOfTurn(state);
    expect(state.sides.opponent.team[0].currentHp).toBe(
      blastoise.stats.hp - Math.max(1, Math.floor(blastoise.stats.hp / 16))
    );
    expect(events.some((e) => e.type === "secondary-damage" && e.cause === "burn")).toBe(true);
  });

  it("badly-poisoned damage increases each turn", () => {
    const rng = new SeededRNG(1);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    blastoise.status = { condition: "badly-poisoned", counter: 1 };
    const engine = new BattleEngine(rng);
    const state = engine.createBattle([buildPokemon("c", "charizard", ["tackle"])], [blastoise]);

    processEndOfTurn(state);
    const hpAfterFirst = state.sides.opponent.team[0].currentHp;
    processEndOfTurn(state);
    const hpAfterSecond = state.sides.opponent.team[0].currentHp;

    const firstLoss = blastoise.stats.hp - hpAfterFirst;
    const secondLoss = hpAfterFirst - hpAfterSecond;
    expect(secondLoss).toBeGreaterThan(firstLoss);
  });
});
