import { describe, expect, it } from "vitest";
import { filters, frames, layouts } from "./catalog";

describe("WinkBooth catalogs", () => {
  it("ships the promised creative range", () => {
    expect(frames).toHaveLength(74);
    expect(filters.length).toBeGreaterThanOrEqual(40);
    expect(layouts.length).toBeGreaterThanOrEqual(12);
  });

  it("keeps every photo slot inside its printable canvas", () => {
    for (const layout of layouts) {
      expect(layout.slots.length).toBeGreaterThan(0);
      for (const slot of layout.slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.x + slot.w).toBeLessThanOrEqual(1);
        expect(slot.y + slot.h).toBeLessThanOrEqual(1);
      }
    }
  });

  it("references valid layouts from every frame", () => {
    const ids = new Set(layouts.map((layout) => layout.id));
    for (const frame of frames) expect(ids.has(frame.layoutId)).toBe(true);
  });
});
