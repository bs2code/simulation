import { getItem } from "@/data/items";
import { getMove } from "@/data/moves";
import { getSpecies } from "@/data/pokemon";
import type { BattleEvent, BattleSideId, BattleState, HazardId } from "@/types/battle";
import type { NonVolatileStatus, StatStages } from "@/types/pokemon";

function pokemonLabel(state: BattleState, side: BattleSideId, pokemonId: string): string {
  const pokemon = state.sides[side].team.find((p) => p.id === pokemonId);
  if (!pokemon) return pokemonId;
  return pokemon.nickname ?? getSpecies(pokemon.speciesId).name;
}

const STAT_LABELS: Record<keyof StatStages, string> = {
  attack: "Attack",
  defense: "Defense",
  specialAttack: "Sp. Atk",
  specialDefense: "Sp. Def",
  speed: "Speed",
  accuracy: "accuracy",
  evasion: "evasiveness",
};

const STATUS_VERB: Record<NonVolatileStatus, string> = {
  none: "cured",
  burn: "burned",
  freeze: "frozen solid",
  paralysis: "paralyzed",
  poison: "poisoned",
  "badly-poisoned": "badly poisoned",
  sleep: "put to sleep",
};

const STATUS_CURE_LABEL: Record<NonVolatileStatus, string> = {
  none: "cured",
  burn: "healed its burn",
  freeze: "thawed out",
  paralysis: "recovered from paralysis",
  poison: "recovered from poison",
  "badly-poisoned": "recovered from poison",
  sleep: "woke up",
};

const HAZARD_LABELS: Record<HazardId, string> = {
  "stealth-rock": "Pointed stones floated",
  spikes: "Spikes were scattered",
  "toxic-spikes": "Poison spikes were scattered",
  "sticky-web": "A sticky web spread out",
};

const SECONDARY_DAMAGE_LABELS: Record<string, string> = {
  burn: "was hurt by its burn",
  poison: "was hurt by poison",
  "badly-poisoned": "was hurt by poison",
  sandstorm: "was buffeted by the sandstorm",
  hail: "was pelted by hail",
  "solar-power": "was hurt by Solar Power",
  "life-orb": "was hurt by its Life Orb",
  recoil: "was hurt by recoil",
  confusion: "hurt itself in its confusion",
  "stealth-rock": "was hurt by Stealth Rock",
  spikes: "was hurt by Spikes",
  "toxic-spikes": "was hurt by Toxic Spikes",
};

const HEAL_LABELS: Record<string, string> = {
  leftovers: "restored a little HP with its Leftovers",
  "rain-dish": "restored a little HP with Rain Dish",
  "grassy-terrain": "restored a little HP",
  move: "restored HP",
};

const FORM_CHANGE_LABELS: Record<string, string> = {
  mega: "Mega Evolved",
  gigantamax: "Gigantamaxed",
  "battle-bond": "became Ash-Greninja through the bond of battle",
  revert: "reverted to its normal form",
};

const SIDE_LABEL: Record<BattleSideId, string> = { player: "Team A", opponent: "Team B" };

/** Turns one BattleEvent into a human-readable line for the battle log. Empty string = skip. */
export function narrateEvent(event: BattleEvent, state: BattleState): string {
  switch (event.type) {
    case "turn-start":
      return `— Turn ${event.turn} —`;
    case "turn-end":
      return "";
    case "move-used":
      return `${pokemonLabel(state, event.side, event.pokemonId)} used ${getMove(event.moveId).name}!`;
    case "move-missed":
      return `${pokemonLabel(state, event.side, event.pokemonId)}'s attack missed!`;
    case "move-prevented": {
      const name = pokemonLabel(state, event.side, event.pokemonId);
      switch (event.reason) {
        case "sleep":
          return `${name} is fast asleep.`;
        case "frozen":
          return `${name} is frozen solid!`;
        case "paralysis":
          return `${name} is paralyzed! It can't move!`;
        case "flinch":
          return `${name} flinched and couldn't move!`;
        case "confusion":
          return `${name} is confused!`;
      }
      break;
    }
    case "damage": {
      const name = pokemonLabel(state, event.side, event.pokemonId);
      if (event.result.immune) return `It doesn't affect ${name}...`;
      const extra = event.result.critical
        ? " A critical hit!"
        : event.result.superEffective
          ? " It's super effective!"
          : event.result.resisted
            ? " It's not very effective..."
            : "";
      return `${name} took ${event.amount} damage!${extra}`;
    }
    case "fainted":
      return `${pokemonLabel(state, event.side, event.pokemonId)} fainted!`;
    case "stat-change": {
      const name = pokemonLabel(state, event.side, event.pokemonId);
      const direction = event.stages > 0 ? "rose" : "fell";
      const sharply = Math.abs(event.stages) > 1 ? " sharply" : "";
      return `${name}'s ${STAT_LABELS[event.stat]} ${direction}${sharply}!`;
    }
    case "status-applied":
      return `${pokemonLabel(state, event.side, event.pokemonId)} was ${STATUS_VERB[event.status]}!`;
    case "status-cured":
      return `${pokemonLabel(state, event.side, event.pokemonId)} ${STATUS_CURE_LABEL[event.status]}!`;
    case "secondary-damage":
      return `${pokemonLabel(state, event.side, event.pokemonId)} ${SECONDARY_DAMAGE_LABELS[event.cause] ?? "took damage"}!`;
    case "heal":
      return `${pokemonLabel(state, event.side, event.pokemonId)} ${HEAL_LABELS[event.cause] ?? "restored HP"}!`;
    case "item-consumed":
      return `${pokemonLabel(state, event.side, event.pokemonId)} held on using its ${getItem(event.itemId).name}!`;
    case "weather-changed":
      return event.weather === "none" ? "The weather cleared up." : `The weather turned to ${event.weather}!`;
    case "terrain-changed":
      return event.terrain === "none" ? "The terrain returned to normal." : `${event.terrain} terrain spread across the field!`;
    case "hazard-set":
      return `${HAZARD_LABELS[event.hazard]} around the opposing team!`;
    case "form-change": {
      const name = pokemonLabel(state, event.side, event.pokemonId);
      return `${name} ${FORM_CHANGE_LABELS[event.cause]}!`;
    }
    case "z-move-used":
      return `${pokemonLabel(state, event.side, event.pokemonId)} unleashes a Z-Move!`;
    case "switch-out":
      return `${SIDE_LABEL[event.side]} withdrew ${pokemonLabel(state, event.side, event.pokemonId)}!`;
    case "switch-in":
      return `${SIDE_LABEL[event.side]} sent out ${pokemonLabel(state, event.side, event.pokemonId)}!`;
    case "battle-end":
      return event.winner ? `${SIDE_LABEL[event.winner]} wins the battle!` : "The battle ended in a draw.";
  }
  return "";
}

/** Narrates every event in `events` (a slice of a BattleState's log), skipping blanks. */
export function narrateEvents(events: BattleEvent[], state: BattleState): string[] {
  return events.map((e) => narrateEvent(e, state)).filter((line) => line.length > 0);
}
