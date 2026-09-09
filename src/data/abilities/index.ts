import type { Ability } from "@/types/abilities";
import { ABILITY_LIST } from "./abilityList";

const ABILITIES_BY_ID: Map<string, Ability> = new Map(ABILITY_LIST.map((a) => [a.id, a]));

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
  return ABILITY_LIST;
}

export { ABILITY_LIST };
