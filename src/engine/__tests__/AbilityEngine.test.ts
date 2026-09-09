import { describe, expect, it } from "vitest";
import {
  getAbilityTypeImmunities,
  getContactStatusChances,
  getLowHpStabMultiplier,
  getWeatherEndOfTurnDamageFraction,
  getWeatherEndOfTurnHealFraction,
  getWeatherStatMultiplier,
} from "../AbilityEngine";
import { buildPokemon } from "./testHelpers";

describe("AbilityEngine", () => {
  it("Levitate grants immunity to Ground", () => {
    const gengar = buildPokemon("gengar", "gengar", ["shadow-ball"], 50, { ability: "levitate" });
    expect(getAbilityTypeImmunities(gengar)).toContain("Ground");
  });

  it("an ability with no matching trigger contributes no immunities", () => {
    const gengar = buildPokemon("gengar", "gengar", ["shadow-ball"], 50, { ability: "cursed-body" });
    expect(getAbilityTypeImmunities(gengar)).toEqual([]);
  });

  it("Blaze boosts Fire-type moves only at or below 1/3 HP", () => {
    const charizard = buildPokemon("charizard", "charizard", ["ember"], 50, { ability: "blaze" });
    expect(getLowHpStabMultiplier(charizard, "Fire")).toBe(1);
    charizard.currentHp = Math.floor(charizard.stats.hp / 3);
    expect(getLowHpStabMultiplier(charizard, "Fire")).toBe(1.5);
    expect(getLowHpStabMultiplier(charizard, "Water")).toBe(1);
  });

  it("Chlorophyll doubles speed in sun", () => {
    const venusaur = buildPokemon("venusaur", "venusaur", ["vine-whip"], 50, { ability: "chlorophyll" });
    expect(getWeatherStatMultiplier(venusaur, "none", "speed")).toBe(1);
    expect(getWeatherStatMultiplier(venusaur, "sun", "speed")).toBe(2);
  });

  it("Solar Power boosts Special Attack in sun and drains HP at end of turn", () => {
    const charizard = buildPokemon("charizard", "charizard", ["flamethrower"], 50, { ability: "solar-power" });
    expect(getWeatherStatMultiplier(charizard, "sun", "specialAttack")).toBe(1.5);
    expect(getWeatherStatMultiplier(charizard, "rain", "specialAttack")).toBe(1);
    expect(getWeatherEndOfTurnDamageFraction(charizard, "sun")).toBeCloseTo(1 / 8);
    expect(getWeatherEndOfTurnDamageFraction(charizard, "rain")).toBe(0);
  });

  it("Rain Dish heals a fraction of max HP at end of turn while raining", () => {
    const blastoise = buildPokemon("blastoise", "blastoise", ["tackle"], 50, { ability: "rain-dish" });
    expect(getWeatherEndOfTurnHealFraction(blastoise, "rain")).toBeCloseTo(1 / 16);
    expect(getWeatherEndOfTurnHealFraction(blastoise, "none")).toBe(0);
  });

  it("Static offers a contact-based paralysis chance", () => {
    const pikachu = buildPokemon("pikachu", "pikachu", ["thunderbolt"], 50, { ability: "static" });
    expect(getContactStatusChances(pikachu)).toEqual([{ status: "paralysis", chance: 30 }]);
  });

  it("a Pokémon without a matching ability trigger yields no contact status chances", () => {
    const charizard = buildPokemon("charizard", "charizard", ["ember"]);
    expect(getContactStatusChances(charizard)).toEqual([]);
  });
});
