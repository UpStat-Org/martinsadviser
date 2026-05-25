import { describe, it, expect, beforeAll } from "vitest";
import { currentQuarterTag, drawQuarterlySelection, isDriverInPool } from "../drugTestingPool";
import type { Driver } from "@/hooks/useDrivers";

function mkDriver(id: string, overrides: Partial<Driver> = {}): Driver {
  return {
    id,
    full_name: `Driver ${id}`,
    status: "active",
    cdl_number: `CDL-${id}`,
    ...(overrides as Record<string, unknown>),
  } as unknown as Driver;
}

describe("isDriverInPool", () => {
  it("requires active status and a CDL number", () => {
    expect(isDriverInPool(mkDriver("a"))).toBe(true);
    expect(isDriverInPool(mkDriver("a", { status: "inactive" }))).toBe(false);
    expect(isDriverInPool(mkDriver("a", { cdl_number: null }))).toBe(false);
  });
});

describe("currentQuarterTag", () => {
  it("returns YYYY-Qn", () => {
    expect(currentQuarterTag(new Date("2026-02-15T00:00:00Z"))).toBe("2026-Q1");
    expect(currentQuarterTag(new Date("2026-11-15T00:00:00Z"))).toBe("2026-Q4");
  });
});

describe("drawQuarterlySelection", () => {
  // Deterministic Math.random for assertions.
  beforeAll(() => {
    let seed = 1;
    Math.random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
  });

  it("respects the 50%/10% annual rate split over four quarters and avoids overlap", () => {
    const drivers = Array.from({ length: 40 }, (_, i) => mkDriver(`d${i}`));
    const split = drawQuarterlySelection(drivers);
    // 40 * 50% / 4 quarters = 5 drug, 40 * 10% / 4 quarters = 1 alcohol.
    expect(split.poolSize).toBe(40);
    expect(split.drugCount).toBe(5);
    expect(split.alcoholCount).toBe(1);
    expect(split.drugDrivers).toHaveLength(5);
    expect(split.alcoholDrivers).toHaveLength(1);

    const drugIds = new Set(split.drugDrivers.map((d) => d.id));
    for (const a of split.alcoholDrivers) {
      expect(drugIds.has(a.id)).toBe(false);
    }
  });

  it("skips drivers in the excludeIds set", () => {
    const drivers = Array.from({ length: 8 }, (_, i) => mkDriver(`d${i}`));
    const exclude = new Set(["d0", "d1", "d2"]);
    const split = drawQuarterlySelection(drivers, exclude);
    expect(split.poolSize).toBe(5);
    for (const d of [...split.drugDrivers, ...split.alcoholDrivers]) {
      expect(exclude.has(d.id)).toBe(false);
    }
  });

  it("handles an empty pool without crashing", () => {
    const split = drawQuarterlySelection([]);
    expect(split.poolSize).toBe(0);
    expect(split.drugDrivers).toEqual([]);
    expect(split.alcoholDrivers).toEqual([]);
  });
});
