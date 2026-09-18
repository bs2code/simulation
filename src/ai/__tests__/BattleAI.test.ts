import { describe, expect, it } from "vitest";
import { BattleAI } from "../BattleAI";
import { BattleEngine } from "@/engine/BattleEngine";
import { SeededRNG } from "@/utils/rng";
import { buildPokemon } from "@/engine/__tests__/testHelpers";

describe("BattleAI (easy)", () => {
  it("always returns a legal move action for one of the Pokémon's usable moves", () => {
    const ai = new BattleAI("easy", new SeededRNG(1));
    const engine = new BattleEngine(new SeededRNG(1));
    const charizard = buildPokemon("charizard", "charizard", ["ember", "flamethrower", "swords-dance"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard], [blastoise]);

    const action = ai.chooseAction(state, "player");
    expect(action.type).toBe("move");
    if (action.type === "move") {
      expect(["ember", "flamethrower", "swords-dance"]).toContain(action.moveId);
    }
  });

  it("picks varied moves across different seeds (not deterministically the same one)", () => {
    const engine = new BattleEngine(new SeededRNG(1));
    const charizard = buildPokemon("charizard", "charizard", ["ember", "flamethrower", "swords-dance"]);
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"]);
    const state = engine.createBattle([charizard], [blastoise]);

    const chosen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const ai = new BattleAI("easy", new SeededRNG(seed));
      const action = ai.chooseAction(state, "player");
      if (action.type === "move") chosen.add(action.moveId);
    }
    expect(chosen.size).toBeGreaterThan(1);
  });

  it("never mutates the BattleState it's given", () => {
    const ai = new BattleAI("easy", new SeededRNG(1));
    const engine = new BattleEngine(new SeededRNG(1));
    const state = engine.createBattle(
      [buildPokemon("c", "charizard", ["ember"])],
      [buildPokemon("b", "blastoise", ["tackle"])]
    );
    const before = JSON.stringify(state);
    ai.chooseAction(state, "player");
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("BattleAI (normal)", () => {
  it("picks the top-ranked move by damage/type effectiveness when healthy", () => {
    const ai = new BattleAI("normal", new SeededRNG(1));
    const engine = new BattleEngine(new SeededRNG(1));
    // Water-gun is super effective on Charizard; Growl deals no damage — normal play should attack.
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun", "growl"]);
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    const state = engine.createBattle([blastoise], [charizard]);

    const action = ai.chooseAction(state, "player");
    expect(action).toEqual({ type: "move", pokemonId: blastoise.id, moveId: "water-gun" });
  });

  it("switches out when at critically low HP and a clearly safer bench option exists", () => {
    const ai = new BattleAI("normal", new SeededRNG(1));
    const engine = new BattleEngine(new SeededRNG(1));
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    charizard.currentHp = Math.floor(charizard.stats.hp * 0.1); // critically low
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]); // resists Fire, healthy
    const opponent = buildPokemon("opp", "charizard", ["ember"]); // attacks with Fire — bad matchup for our Charizard
    const state = engine.createBattle([charizard, blastoise], [opponent]);

    const action = ai.chooseAction(state, "player");
    expect(action).toEqual({ type: "switch", pokemonId: blastoise.id });
  });

  it("does not switch at low HP if there's no meaningfully better option on the bench", () => {
    const ai = new BattleAI("normal", new SeededRNG(1));
    const engine = new BattleEngine(new SeededRNG(1));
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    charizard.currentHp = Math.floor(charizard.stats.hp * 0.1);
    const alsoCharizard = buildPokemon("bench-charizard", "charizard", ["ember"]); // no better matchup
    const opponent = buildPokemon("opp", "blastoise", ["water-gun"]);
    const state = engine.createBattle([charizard, alsoCharizard], [opponent]);

    const action = ai.chooseAction(state, "player");
    expect(action.type).toBe("move");
  });

  it("never mutates the BattleState it's given", () => {
    const ai = new BattleAI("normal", new SeededRNG(1));
    const engine = new BattleEngine(new SeededRNG(1));
    const state = engine.createBattle(
      [buildPokemon("c", "charizard", ["ember"])],
      [buildPokemon("b", "blastoise", ["tackle"])]
    );
    const before = JSON.stringify(state);
    ai.chooseAction(state, "player");
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("BattleAI (expert)", () => {
  it("takes a near-certain KO instead of switching or setting up", () => {
    const ai = new BattleAI("expert", new SeededRNG(1));
    const engine = new BattleEngine(new SeededRNG(1));
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower", "swords-dance"], 100);
    const weakling = buildPokemon("weak", "venusaur", ["tackle"], 1);
    const state = engine.createBattle([charizard], [weakling]);

    const action = ai.chooseAction(state, "player");
    expect(action).toEqual({ type: "move", pokemonId: charizard.id, moveId: "flamethrower" });
  });

  it("proactively switches out of a bad type matchup even well above the Normal AI's low-HP threshold", () => {
    const engine = new BattleEngine(new SeededRNG(1));
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    blastoise.currentHp = Math.floor(blastoise.stats.hp * 0.9); // well above Normal's 25% panic threshold
    const venusaur = buildPokemon("venusaur", "venusaur", ["vine-whip"]); // resists Electric
    const opponent = buildPokemon("opp", "pikachu", ["thunderbolt"]); // Electric is 2x vs Blastoise
    const state = engine.createBattle([blastoise, venusaur], [opponent]);

    const expertAction = new BattleAI("expert", new SeededRNG(1)).chooseAction(state, "player");
    const normalAction = new BattleAI("normal", new SeededRNG(1)).chooseAction(state, "player");

    expect(expertAction).toEqual({ type: "switch", pokemonId: venusaur.id });
    expect(normalAction.type).toBe("move"); // Normal only reacts to its own low HP, not the matchup
  });

  it("sets up with a stat-boosting move at high HP when the incoming threat is low, unlike Normal", () => {
    const engine = new BattleEngine(new SeededRNG(1));
    // Same level so Ember (resisted by Water) isn't a lethal one-shot — this scenario is about
    // setup-vs-attack, not the KO-priority branch. The opponent's only move is a status move
    // (Growl, 0 power), so the estimated incoming threat is 0 — clearly safe to set up.
    const charizard = buildPokemon("charizard", "charizard", ["ember", "swords-dance"]);
    const opponent = buildPokemon("opp", "blastoise", ["growl"]);
    const state = engine.createBattle([charizard], [opponent]);

    const expertAction = new BattleAI("expert", new SeededRNG(1)).chooseAction(state, "player");
    const normalAction = new BattleAI("normal", new SeededRNG(1)).chooseAction(state, "player");

    expect(expertAction).toEqual({ type: "move", pokemonId: charizard.id, moveId: "swords-dance" });
    expect(normalAction).toEqual({ type: "move", pokemonId: charizard.id, moveId: "ember" });
  });

  it("never mutates the BattleState it's given", () => {
    const ai = new BattleAI("expert", new SeededRNG(1));
    const engine = new BattleEngine(new SeededRNG(1));
    const state = engine.createBattle(
      [buildPokemon("c", "charizard", ["ember", "swords-dance"])],
      [buildPokemon("b", "blastoise", ["tackle"])]
    );
    const before = JSON.stringify(state);
    ai.chooseAction(state, "player");
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("BattleAI.chooseSwitchReplacement", () => {
  it("normal/expert pick the best-scoring healthy switch candidate", () => {
    const engine = new BattleEngine(new SeededRNG(1));
    const faintedCharizard = buildPokemon("charizard", "charizard", ["ember"]);
    faintedCharizard.fainted = true;
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]); // resists Fire, counters it
    const venusaur = buildPokemon("venusaur", "venusaur", ["tackle"]); // weak to Fire
    const opponent = buildPokemon("opp", "charizard", ["ember"]);
    const state = engine.createBattle([faintedCharizard, venusaur, blastoise], [opponent]);
    state.phase = "switching";

    const normalChoice = new BattleAI("normal", new SeededRNG(1)).chooseSwitchReplacement(state, "player");
    const expertChoice = new BattleAI("expert", new SeededRNG(1)).chooseSwitchReplacement(state, "player");
    expect(normalChoice).toBe(blastoise.id);
    expect(expertChoice).toBe(blastoise.id);
  });

  it("easy picks a random living, non-fainted teammate", () => {
    const engine = new BattleEngine(new SeededRNG(1));
    const faintedCharizard = buildPokemon("charizard", "charizard", ["ember"]);
    faintedCharizard.fainted = true;
    const blastoise = buildPokemon("blastoise", "blastoise", ["water-gun"]);
    const venusaur = buildPokemon("venusaur", "venusaur", ["tackle"]);
    const opponent = buildPokemon("opp", "charizard", ["ember"]);
    const state = engine.createBattle([faintedCharizard, venusaur, blastoise], [opponent]);
    state.phase = "switching";

    const choices = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      choices.add(new BattleAI("easy", new SeededRNG(seed)).chooseSwitchReplacement(state, "player"));
    }
    expect(choices.has(faintedCharizard.id)).toBe(false);
    expect(choices.size).toBeGreaterThan(1);
  });
});

describe("BattleAI: respects a Choice item lock", () => {
  it("only ever submits the locked move, across every difficulty and many seeds", () => {
    const engine = new BattleEngine(new SeededRNG(1));
    const leafeon = buildPokemon("leafeon", "leafeon", ["knock-off", "quick-attack", "swords-dance"], 50, {
      item: "choice-band",
    });
    leafeon.choiceLockedMoveId = "knock-off";
    const opponent = buildPokemon("opp", "blastoise", ["tackle"]);
    const state = engine.createBattle([leafeon], [opponent]);

    for (const difficulty of ["easy", "normal", "expert"] as const) {
      for (let seed = 1; seed <= 15; seed++) {
        const action = new BattleAI(difficulty, new SeededRNG(seed)).chooseAction(state, "player");
        expect(action).toEqual({ type: "move", pokemonId: leafeon.id, moveId: "knock-off" });
      }
    }
  });

  it("falls back to Struggle once the locked move itself is out of PP, even if other moves have PP left", () => {
    const engine = new BattleEngine(new SeededRNG(1));
    const leafeon = buildPokemon("leafeon", "leafeon", ["knock-off", "quick-attack"], 50, { item: "choice-band" });
    leafeon.choiceLockedMoveId = "knock-off";
    leafeon.moves.find((m) => m.moveId === "knock-off")!.currentPP = 0;
    const opponent = buildPokemon("opp", "blastoise", ["tackle"]);
    const state = engine.createBattle([leafeon], [opponent]);

    const action = new BattleAI("easy", new SeededRNG(1)).chooseAction(state, "player");
    expect(action).toEqual({ type: "move", pokemonId: leafeon.id, moveId: "struggle" });
  });

  it("a full submitTurn round-trip no longer throws once locked (reproduces the reported bug)", () => {
    const engine = new BattleEngine(new SeededRNG(1));
    const ai = new BattleAI("normal", new SeededRNG(1));
    const leafeon = buildPokemon("leafeon", "leafeon", ["knock-off", "swords-dance", "quick-attack"], 50, {
      item: "choice-band",
    });
    leafeon.choiceLockedMoveId = "knock-off";
    const opponent = buildPokemon("opp", "blastoise", ["tackle"]);
    const state = engine.createBattle([leafeon], [opponent]);

    const playerAction = ai.chooseAction(state, "player");
    const opponentAction = ai.chooseAction(state, "opponent");
    expect(() => engine.submitTurn(state, playerAction, opponentAction)).not.toThrow();
  });
});
