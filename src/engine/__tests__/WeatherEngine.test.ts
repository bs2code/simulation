import { describe, expect, it } from "vitest";
import {
  getTerrainMultiplier,
  getWeatherDamageFraction,
  getWeatherMultiplier,
  setTerrain,
  setWeather,
  tickWeatherAndTerrain,
} from "../WeatherEngine";
import { BattleEngine } from "../BattleEngine";
import { SeededRNG } from "@/utils/rng";
import { buildPokemon } from "./testHelpers";

describe("WeatherEngine multipliers", () => {
  it("sun boosts Fire and weakens Water", () => {
    expect(getWeatherMultiplier("Fire", "sun")).toBe(1.5);
    expect(getWeatherMultiplier("Water", "sun")).toBe(0.5);
    expect(getWeatherMultiplier("Grass", "sun")).toBe(1);
  });

  it("rain boosts Water and weakens Fire", () => {
    expect(getWeatherMultiplier("Water", "rain")).toBe(1.5);
    expect(getWeatherMultiplier("Fire", "rain")).toBe(0.5);
  });

  it("terrain boosts its matching type", () => {
    expect(getTerrainMultiplier("Electric", "electric")).toBeCloseTo(1.3);
    expect(getTerrainMultiplier("Grass", "grassy")).toBeCloseTo(1.3);
    expect(getTerrainMultiplier("Psychic", "psychic")).toBeCloseTo(1.3);
    expect(getTerrainMultiplier("Normal", "electric")).toBe(1);
  });

  it("misty terrain halves Dragon-type damage", () => {
    expect(getTerrainMultiplier("Dragon", "misty")).toBe(0.5);
  });

  it("sandstorm damages non Rock/Ground/Steel types and spares the rest", () => {
    expect(getWeatherDamageFraction("sandstorm", ["Water"])).toBeCloseTo(1 / 16);
    expect(getWeatherDamageFraction("sandstorm", ["Rock"])).toBe(0);
    expect(getWeatherDamageFraction("sandstorm", ["Ground"])).toBe(0);
    expect(getWeatherDamageFraction("sandstorm", ["Steel"])).toBe(0);
  });

  it("hail damages non-Ice types and spares Ice types", () => {
    expect(getWeatherDamageFraction("hail", ["Water"])).toBeCloseTo(1 / 16);
    expect(getWeatherDamageFraction("hail", ["Ice"])).toBe(0);
  });

  it("clear weather deals no damage", () => {
    expect(getWeatherDamageFraction("none", ["Normal"])).toBe(0);
    expect(getWeatherDamageFraction("sun", ["Normal"])).toBe(0);
  });
});

describe("weather/terrain state transitions", () => {
  it("setWeather sets an id and a default duration", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const state = engine.createBattle([buildPokemon("a", "charizard", ["ember"])], [buildPokemon("b", "blastoise", ["tackle"])]);

    const event = setWeather(state, "sun");
    expect(state.weather).toEqual({ id: "sun", turnsRemaining: 5 });
    expect(event).toEqual({ type: "weather-changed", weather: "sun" });
  });

  it("tickWeatherAndTerrain counts down and clears weather/terrain when they expire", () => {
    const rng = new SeededRNG(1);
    const engine = new BattleEngine(rng);
    const state = engine.createBattle([buildPokemon("a", "charizard", ["ember"])], [buildPokemon("b", "blastoise", ["tackle"])]);
    setWeather(state, "rain", 1);
    setTerrain(state, "grassy", 2);

    let events = tickWeatherAndTerrain(state);
    expect(state.weather).toEqual({ id: "none", turnsRemaining: 0 });
    expect(state.terrain).toEqual({ id: "grassy", turnsRemaining: 1 });
    expect(events.some((e) => e.type === "weather-changed" && e.weather === "none")).toBe(true);

    events = tickWeatherAndTerrain(state);
    expect(state.terrain).toEqual({ id: "none", turnsRemaining: 0 });
    expect(events.some((e) => e.type === "terrain-changed" && e.terrain === "none")).toBe(true);
  });
});
