import type { Ability } from "@/types/abilities";
import generatedAbilitiesData from "./generated/abilities.generated.json";
import { ABILITY_LIST } from "./abilityList";

/**
 * Bulk-generated abilities (~300 real ability names — see scripts/generate-pokedex.ts) merged
 * with the hand-curated set that has real AbilityEffect behavior. Curated entries always win on
 * id collision, so e.g. "levitate" keeps its real Ground-immunity effect instead of being
 * overwritten by the generated inert version. Generated abilities have no effects (this engine's
 * AbilityEffect vocabulary doesn't cover most real abilities yet) — same inert pattern already
 * used for curated-but-unimplemented abilities like Cursed Body.
 */
const GENERATED_ABILITIES = generatedAbilitiesData as Ability[];

const ABILITIES_BY_ID: Map<string, Ability> = new Map([
  ...GENERATED_ABILITIES.map((a): [string, Ability] => [a.id, a]),
  ...ABILITY_LIST.map((a): [string, Ability] => [a.id, a]),
]);

const ALL_ABILITIES: Ability[] = Array.from(ABILITIES_BY_ID.values());

export function getAbility(abilityId: string): Ability {
  const ability = ABILITIES_BY_ID.get(abilityId);
  if (!ability) {
    throw new Error(`Unknown ability id: ${abilityId}`);
  }
  return ability;
}

export function findAbility(abilityId: string | undefined): Ability | undefined {
  if (!abilityId) return undefined;
  return ABILITIES_BY_ID.get(abilityId);
}

export function getAllAbilities(): Ability[] {
  return ALL_ABILITIES;
}

/** The hand-curated set only (has real AbilityEffect behavior). */
export { ABILITY_LIST };
