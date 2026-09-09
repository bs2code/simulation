import type { Item } from "@/types/items";
import { ITEM_LIST } from "./itemList";

const ITEMS_BY_ID: Map<string, Item> = new Map(ITEM_LIST.map((item) => [item.id, item]));

export function getItem(itemId: string): Item {
  const item = ITEMS_BY_ID.get(itemId);
  if (!item) {
    throw new Error(`Unknown item id: ${itemId}`);
  }
  return item;
}

export function findItem(itemId: string | undefined): Item | undefined {
  if (!itemId) return undefined;
  return ITEMS_BY_ID.get(itemId);
}

export function getAllItems(): Item[] {
  return ITEM_LIST;
}

export { ITEM_LIST };
