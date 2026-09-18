import { getMove } from "@/data/moves";
import { otherSide, type BattleAction, type BattleSide, type BattleSideId, type BattleState } from "@/types/battle";
import { getChoiceLockedMoveId } from "@/engine/ItemEngine";
import type { BattleMove } from "@/types/moves";
import type { Pokemon } from "@/types/pokemon";
import type { RNG } from "@/utils/rng";
import { MoveEvaluator } from "./MoveEvaluator";
import { SwitchEvaluator } from "./SwitchEvaluator";

export type AIDifficulty = "easy" | "normal" | "expert";

const LOW_HP_SWITCH_THRESHOLD = 0.25;
const MEANINGFUL_SWITCH_IMPROVEMENT = 10;
const EXPERT_BAD_MATCHUP_MULTIPLIER = 2;
const EXPERT_SETUP_HP_THRESHOLD = 0.8;
const EXPERT_SETUP_SAFE_INCOMING_FRACTION = 0.4;
const EXPERT_LETHAL_HIT_CHANCE_THRESHOLD = 0.8;

const STRUGGLE: BattleMove = { moveId: "struggle", currentPP: 1, maxPP: 1 };

function usableMoves(pokemon: Pokemon): BattleMove[] {
  const lockedMoveId = getChoiceLockedMoveId(pokemon);
  if (lockedMoveId) {
    // A Choice item holder can only ever submit its locked move — anything else is rejected by
    // TurnEngine.validateAction, so the AI must never even consider another option here. If the
    // locked move itself has run out of PP, Struggle is the only thing left (matches
    // validateAction's Struggle-legality check for this same situation).
    const locked = pokemon.moves.find((m) => m.moveId === lockedMoveId);
    if (locked && locked.currentPP > 0 && !locked.disabled) return [locked];
    return [STRUGGLE];
  }
  const withPP = pokemon.moves.filter((m) => m.currentPP > 0 && !m.disabled);
  // TurnEngine only accepts "struggle" when every real move is out of PP — matches that here.
  return withPP.length > 0 ? withPP : [STRUGGLE];
}

/**
 * Chooses an action for one side of a battle. Never touches BattleState — it only reads it and
 * returns a BattleAction for BattleEngine to resolve, exactly like a human player would submit one.
 * Difficulty changes which heuristics chooseAction consults, not the shared MoveEvaluator/
 * SwitchEvaluator scoring itself.
 */
export class BattleAI {
  private readonly moveEvaluator: MoveEvaluator;
  private readonly switchEvaluator: SwitchEvaluator;

  constructor(
    private readonly difficulty: AIDifficulty,
    private readonly rng: RNG,
    moveEvaluator: MoveEvaluator = new MoveEvaluator(),
    switchEvaluator: SwitchEvaluator = new SwitchEvaluator()
  ) {
    this.moveEvaluator = moveEvaluator;
    this.switchEvaluator = switchEvaluator;
  }

  /** Assumes `state.phase === "choosing"` — the active Pokémon on `side` hasn't fainted. */
  chooseAction(state: BattleState, side: BattleSideId): BattleAction {
    const mySide = state.sides[side];
    const opponentSide = state.sides[otherSide(side)];
    const active = mySide.team[mySide.activePokemonIndex];
    const opponentActive = opponentSide.team[opponentSide.activePokemonIndex];
    const moves = usableMoves(active);

    switch (this.difficulty) {
      case "easy":
        return this.chooseEasyAction(active, moves);
      case "normal":
        return this.chooseNormalAction(mySide, active, opponentActive, moves);
      case "expert":
        return this.chooseExpertAction(mySide, opponentSide, active, opponentActive, moves);
    }
  }

  /**
   * Picks a replacement during the "switching" phase (the active Pokémon on `side` has fainted).
   * Separate from chooseAction because there's no move to evaluate here — only which benched
   * Pokémon to send out next.
   */
  chooseSwitchReplacement(state: BattleState, side: BattleSideId): string {
    const mySide = state.sides[side];
    const opponentSide = state.sides[otherSide(side)];
    const opponentActive = opponentSide.team[opponentSide.activePokemonIndex];

    if (this.difficulty === "easy") {
      const alive = mySide.team.filter((p) => !p.fainted);
      return alive[this.rng.integer(0, alive.length - 1)].id;
    }

    const options =
      this.difficulty === "expert"
        ? this.switchEvaluator.evaluateSwitchOptionsAgainstTeam(mySide, opponentSide.team)
        : this.switchEvaluator.evaluateSwitchOptions(mySide, opponentActive);
    return options[0].pokemonId;
  }

  /** EASY: essentially random move selection, no switching. */
  private chooseEasyAction(active: Pokemon, moves: BattleMove[]): BattleAction {
    const choice = moves[this.rng.integer(0, moves.length - 1)];
    return { type: "move", pokemonId: active.id, moveId: choice.moveId };
  }

  /**
   * NORMAL: picks the highest-scoring move (damage, type effectiveness, KO potential all folded
   * into MoveEvaluator's score) and reactively switches only when in real danger — low HP with a
   * clearly safer bench option.
   */
  private chooseNormalAction(
    mySide: BattleSide,
    active: Pokemon,
    opponentActive: Pokemon,
    moves: BattleMove[]
  ): BattleAction {
    const hpFraction = active.currentHp / active.stats.hp;
    if (hpFraction <= LOW_HP_SWITCH_THRESHOLD) {
      const [bestSwitch] = this.switchEvaluator.evaluateSwitchOptions(mySide, opponentActive);
      if (bestSwitch && bestSwitch.score > MEANINGFUL_SWITCH_IMPROVEMENT) {
        return { type: "switch", pokemonId: bestSwitch.pokemonId };
      }
    }

    const ranked = this.moveEvaluator.rankMoves(active, opponentActive, moves.map((m) => getMove(m.moveId)));
    return { type: "move", pokemonId: active.id, moveId: ranked[0].moveId };
  }

  /**
   * EXPERT: takes a near-certain KO immediately; otherwise proactively switches out of a bad type
   * matchup (using whole-remaining-team synergy, not just the current opponent) even before taking
   * heavy damage; sets up with a stat-boosting move when safe to do so (a one-turn lookahead at the
   * opponent's likely damage); and otherwise falls back to the best-scoring move, which already
   * favors super-effective hits and inflicting status on a healthy target.
   */
  private chooseExpertAction(
    mySide: BattleSide,
    opponentSide: BattleSide,
    active: Pokemon,
    opponentActive: Pokemon,
    moves: BattleMove[]
  ): BattleAction {
    const moveObjs = moves.map((m) => getMove(m.moveId));
    const ranked = this.moveEvaluator.rankMoves(active, opponentActive, moveObjs);
    const best = ranked[0];

    if (best.isLethal && best.hitChance >= EXPERT_LETHAL_HIT_CHANCE_THRESHOLD) {
      return { type: "move", pokemonId: active.id, moveId: best.moveId };
    }

    const switchOptions = this.switchEvaluator.evaluateSwitchOptionsAgainstTeam(mySide, opponentSide.team);
    const currentMatchup = this.switchEvaluator.evaluateSwitchOptionsAgainstTeam(
      { ...mySide, activePokemonIndex: -1 }, // treat the current active as a "candidate" too, for a fair comparison
      opponentSide.team
    );
    const currentAsCandidate = currentMatchup.find((c) => c.pokemonId === active.id);

    if (switchOptions.length > 0 && currentAsCandidate) {
      const badMatchupNow = currentAsCandidate.worstIncomingMultiplier >= EXPERT_BAD_MATCHUP_MULTIPLIER;
      const [bestSwitch] = switchOptions;
      const meaningfullyBetter = bestSwitch.score > currentAsCandidate.score + MEANINGFUL_SWITCH_IMPROVEMENT;
      if (badMatchupNow && meaningfullyBetter) {
        return { type: "switch", pokemonId: bestSwitch.pokemonId };
      }
    }

    const opponentMoveObjs = opponentActive.moves.map((m) => getMove(m.moveId));
    const opponentThreat = this.moveEvaluator.rankMoves(opponentActive, active, opponentMoveObjs)[0];
    const incomingFraction = opponentThreat ? (opponentThreat.expectedDamage * opponentThreat.hitChance) / active.stats.hp : 0;
    const hpFraction = active.currentHp / active.stats.hp;

    const setupMove = ranked.find((m) => m.hasPositiveStatChangeForSelf);
    if (
      setupMove &&
      hpFraction >= EXPERT_SETUP_HP_THRESHOLD &&
      incomingFraction < EXPERT_SETUP_SAFE_INCOMING_FRACTION
    ) {
      return { type: "move", pokemonId: active.id, moveId: setupMove.moveId };
    }

    return { type: "move", pokemonId: active.id, moveId: best.moveId };
  }
}
