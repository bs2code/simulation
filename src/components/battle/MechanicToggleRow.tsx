import { getSpecies } from "@/data/pokemon";
import { canActivateMechanic } from "@/engine/MechanicsEngine";
import type { BattleSideId, BattleState } from "@/types/battle";
import type { BattleMechanic } from "@/types/mechanics";
import type { Pokemon } from "@/types/pokemon";

const MECHANIC_LABEL: Record<BattleMechanic, string> = {
  mega: "Mega Evolve",
  gigantamax: "Dynamax",
  "z-move": "Z-Move",
  "battle-bond": "Battle Bond",
};

const MECHANICS_TO_OFFER: BattleMechanic[] = ["mega", "gigantamax", "z-move"];

/**
 * In the real games any Pokémon can Dynamax, but the ~30 species with a Gigantamax form always
 * Gigantamax instead when they do — there's no separate player choice between the two for a
 * capable species, so the button just reflects whichever one this specific Pokémon will get.
 */
function mechanicLabel(mechanic: BattleMechanic, active: Pokemon): string {
  if (mechanic === "gigantamax" && getSpecies(active.speciesId).forms?.some((f) => f.formCategory === "gigantamax")) {
    return "Gigantamax";
  }
  return MECHANIC_LABEL[mechanic];
}

/** Toggle row for the mechanics legal for the active Pokémon on `side` right now (if any). */
export function MechanicToggleRow({
  state,
  side,
  selected,
  onToggle,
}: {
  state: BattleState;
  side: BattleSideId;
  selected: BattleMechanic | undefined;
  onToggle: (mechanic: BattleMechanic | undefined) => void;
}) {
  const battleSide = state.sides[side];
  const active = battleSide.team[battleSide.activePokemonIndex];
  const available = MECHANICS_TO_OFFER.filter(
    (m) => canActivateMechanic(active, battleSide, m, state.rules).ok
  );

  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((mechanic) => (
        <button
          key={mechanic}
          type="button"
          onClick={() => onToggle(selected === mechanic ? undefined : mechanic)}
          className={`rounded-full border-2 px-3 py-1 text-xs font-medium transition-colors ${
            selected === mechanic
              ? "border-gold bg-gold text-gold-ink"
              : "border-panel-muted text-ink-muted hover:border-gold hover:text-gold"
          }`}
        >
          {mechanicLabel(mechanic, active)}
        </button>
      ))}
    </div>
  );
}
