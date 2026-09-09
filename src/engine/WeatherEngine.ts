import type { BattleEvent, BattleState, TerrainId, WeatherId } from "@/types/battle";
import type { PokemonType } from "@/types/pokemon";

const DEFAULT_WEATHER_TURNS = 5;
const DEFAULT_TERRAIN_TURNS = 5;

export function getWeatherMultiplier(moveType: PokemonType, weather: WeatherId): number {
  if (weather === "sun") {
    if (moveType === "Fire") return 1.5;
    if (moveType === "Water") return 0.5;
  }
  if (weather === "rain") {
    if (moveType === "Water") return 1.5;
    if (moveType === "Fire") return 0.5;
  }
  return 1;
}

export function getTerrainMultiplier(moveType: PokemonType, terrain: TerrainId): number {
  if (terrain === "electric" && moveType === "Electric") return 1.3;
  if (terrain === "grassy" && moveType === "Grass") return 1.3;
  if (terrain === "psychic" && moveType === "Psychic") return 1.3;
  if (terrain === "misty" && moveType === "Dragon") return 0.5;
  return 1;
}

/** Sets the field's weather in place and returns the event describing it. */
export function setWeather(state: BattleState, weather: WeatherId, turns = DEFAULT_WEATHER_TURNS): BattleEvent {
  state.weather = { id: weather, turnsRemaining: weather === "none" ? 0 : turns };
  return { type: "weather-changed", weather };
}

export function setTerrain(state: BattleState, terrain: TerrainId, turns = DEFAULT_TERRAIN_TURNS): BattleEvent {
  state.terrain = { id: terrain, turnsRemaining: terrain === "none" ? 0 : turns };
  return { type: "terrain-changed", terrain };
}

/** Counts down weather/terrain each turn, clearing them when their duration runs out. */
export function tickWeatherAndTerrain(state: BattleState): BattleEvent[] {
  const events: BattleEvent[] = [];

  if (state.weather.id !== "none") {
    state.weather.turnsRemaining -= 1;
    if (state.weather.turnsRemaining <= 0) {
      state.weather = { id: "none", turnsRemaining: 0 };
      events.push({ type: "weather-changed", weather: "none" });
    }
  }

  if (state.terrain.id !== "none") {
    state.terrain.turnsRemaining -= 1;
    if (state.terrain.turnsRemaining <= 0) {
      state.terrain = { id: "none", turnsRemaining: 0 };
      events.push({ type: "terrain-changed", terrain: "none" });
    }
  }

  return events;
}

/** Sandstorm/hail chip damage fraction for a given weather + defender types. 0 if immune/not applicable. */
export function getWeatherDamageFraction(weather: WeatherId, types: PokemonType[]): number {
  if (weather === "sandstorm") {
    const immune = types.some((t) => t === "Rock" || t === "Ground" || t === "Steel");
    return immune ? 0 : 1 / 16;
  }
  if (weather === "hail" || weather === "snow") {
    const immune = types.includes("Ice");
    return immune ? 0 : 1 / 16;
  }
  return 0;
}
