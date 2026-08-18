import { describe, expect, it } from "vitest";
import { normalizePlacement } from "./repository.js";

describe("sticker placements", () => {
  it("bounds transforms so placements remain usable across viewport sizes", () => {
    expect(normalizePlacement({ x: -10, y: 140, scale: 9, rotation: -400, layer: 2.7 })).toEqual({ x: 0, y: 100, scale: 4, rotation: -180, layer: 3 });
  });

  it("rejects non-finite transforms", () => {
    expect(() => normalizePlacement({ x: Number.NaN, y: 10, scale: 1, rotation: 0, layer: 0 })).toThrowError(/must be numbers/);
  });
});
