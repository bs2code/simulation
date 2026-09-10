import { getSpecies } from "@/data/pokemon";
import { getMove } from "@/data/moves";
import {
  createBattleMove,
  type BattleMove,
} from "@/types/moves";
import {
  createDefaultMechanicState,
  createDefaultStatStages,
  createDefaultStatus,
  DEFAULT_EVS,
  DEFAULT_IVS,
  type EVs,
  type IVs,
  type Nature,
  type Pokemon,
} from "@/types/pokemon";
import { calculateStats } from "./statCalculator";

export type CreatePokemonConfig = {
  id: string;
  speciesId: string;
  level: number;
  nature: Nature;
  ability: string;
  moveIds: string[];
  item?: string;
  nickname?: string;
  ivs?: IVs;
  evs?: EVs;
  form?: string;
};

/** Builds a fully-initialized battle Pokémon (full HP, no status, neutral stages) from species data. */
export function createPokemon(config: CreatePokemonConfig): Pokemon {
  const species = getSpecies(config.speciesId);
  const ivs = config.ivs ?? DEFAULT_IVS;
  const evs = config.evs ?? DEFAULT_EVS;
  // A starting form (e.g. a regional variant chosen in the team builder) has its own base
  // stats — unlike Mega/Gigantamax, which start in the base form and transform mid-battle via
  // MechanicsEngine, a form specified here is what the Pokémon *is* from turn one.
  const startingForm = config.form ? species.forms?.find((f) => f.id === config.form) : undefined;
  const baseStats = startingForm?.baseStats ?? species.baseStats;
  const stats = calculateStats(baseStats, config.level, config.nature, ivs, evs);
  const moves: BattleMove[] = config.moveIds.map((moveId) => createBattleMove(getMove(moveId)));

  return {
    id: config.id,
    speciesId: config.speciesId,
    nickname: config.nickname,
    level: config.level,
    nature: config.nature,
    ability: config.ability,
    item: config.item,
    moves,
    ivs,
    evs,
    stats,
    currentHp: stats.hp,
    status: createDefaultStatus(),
    statStages: createDefaultStatStages(),
    volatileStatuses: [],
    fainted: false,
    form: config.form,
    mechanicState: createDefaultMechanicState(),
  };
}
