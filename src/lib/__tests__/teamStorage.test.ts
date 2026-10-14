import { describe, expect, it } from "vitest";
import { sanitizeMembers } from "../teamStorage";
import type { CreatePokemonConfig } from "@/utils/createPokemon";

function validConfig(overrides: Partial<CreatePokemonConfig> = {}): CreatePokemonConfig {
  return {
    id: "draft",
    speciesId: "charizard",
    level: 50,
    nature: "Hardy",
    ability: "blaze",
    moveIds: ["ember", "flamethrower"],
    ...overrides,
  };
}

describe("sanitizeMembers", () => {
  it("keeps a member whose species/ability/moves all still exist", () => {
    const config = validConfig();
    expect(sanitizeMembers([config])).toEqual([config]);
  });

  it("drops a member whose speciesId no longer resolves (reproduces the reported crash)", () => {
    const config = validConfig({ speciesId: "some-removed-or-renamed-species" });
    expect(sanitizeMembers([config])).toEqual([]);
  });

  it("drops a member with a move id that no longer exists", () => {
    const config = validConfig({ moveIds: ["ember", "this-move-was-removed"] });
    expect(sanitizeMembers([config])).toEqual([]);
  });

  it("drops a member with no moves at all", () => {
    const config = validConfig({ moveIds: [] });
    expect(sanitizeMembers([config])).toEqual([]);
  });

  it("drops a member whose ability no longer exists", () => {
    const config = validConfig({ ability: "some-removed-ability" });
    expect(sanitizeMembers([config])).toEqual([]);
  });

  it("drops a member whose held item no longer exists", () => {
    const config = validConfig({ item: "some-removed-item" });
    expect(sanitizeMembers([config])).toEqual([]);
  });

  it("keeps a member with no held item at all (item is optional)", () => {
    const config = validConfig({ item: undefined });
    expect(sanitizeMembers([config])).toEqual([config]);
  });

  it("drops a member whose form id no longer exists on its species", () => {
    const config = validConfig({ speciesId: "lycanroc", form: "a-form-id-that-was-renamed" });
    expect(sanitizeMembers([config])).toEqual([]);
  });

  it("keeps a member with a form id that still exists", () => {
    const config = validConfig({ speciesId: "lycanroc", form: "lycanroc-dusk" });
    expect(sanitizeMembers([config])).toEqual([config]);
  });

  it("keeps the valid members and drops only the invalid ones in a mixed team", () => {
    const good = validConfig({ id: "good" });
    const bad = validConfig({ id: "bad", speciesId: "not-a-real-species" });
    expect(sanitizeMembers([good, bad])).toEqual([good]);
  });

  it("tolerates completely malformed input without throwing", () => {
    expect(sanitizeMembers(undefined)).toEqual([]);
    expect(sanitizeMembers(null)).toEqual([]);
    expect(sanitizeMembers("not an array")).toEqual([]);
    expect(sanitizeMembers([null, 42, "garbage", {}])).toEqual([]);
  });
});
