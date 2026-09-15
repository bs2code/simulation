/**
 * A battle's configurable ruleset. Nothing about mechanics is hard-coded into the engine —
 * every battle carries its own BattleRules, so a "custom" ruleset is just a different object,
 * not a different code path.
 */
export type BattleRules = {
  teamSize: number;
  levelCap: number;
  allowMegaEvolution: boolean;
  allowZMoves: boolean;
  /** Gates the "gigantamax" BattleMechanic, which covers both plain Dynamax (any Pokémon) and Gigantamax (species with a Gigantamax form transform into it automatically instead). */
  allowGigantamax: boolean;
  allowBattleBond: boolean;
  maxMegaUsesPerBattle: number;
  maxZMovesPerBattle: number;
  maxGigantamaxUsesPerBattle: number;
};

/** A permissive "anything goes" ruleset used when a battle doesn't specify its own. */
export const STANDARD_RULES: BattleRules = {
  teamSize: 6,
  levelCap: 100,
  allowMegaEvolution: true,
  allowZMoves: true,
  allowGigantamax: true,
  allowBattleBond: true,
  maxMegaUsesPerBattle: 1,
  maxZMovesPerBattle: 1,
  maxGigantamaxUsesPerBattle: 1,
};
