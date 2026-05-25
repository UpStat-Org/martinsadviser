import { describe, it, expect } from "vitest";
import { BASICS, scoreLevel } from "../csa";

describe("BASICS metadata", () => {
  it("has the seven BASIC categories with thresholds and labels", () => {
    expect(BASICS.map((b) => b.key)).toEqual([
      "unsafe_driving",
      "hours_of_service",
      "driver_fitness",
      "controlled_substances",
      "vehicle_maintenance",
      "hazmat_compliance",
      "crash_indicator",
    ]);
    for (const basic of BASICS) {
      expect(basic.labelKey).toMatch(/^csa\.basic\./);
      expect(basic.threshold).toBeGreaterThan(0);
      expect(basic.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("scoreLevel", () => {
  it("treats null/undefined scores as ok", () => {
    expect(scoreLevel(null, 65)).toBe("ok");
    expect(scoreLevel(undefined, 65)).toBe("ok");
  });

  it("returns 'alert' at or above threshold", () => {
    expect(scoreLevel(65, 65)).toBe("alert");
    expect(scoreLevel(80, 65)).toBe("alert");
  });

  it("returns 'watch' within 15 points below threshold", () => {
    expect(scoreLevel(50, 65)).toBe("watch");
    expect(scoreLevel(64, 65)).toBe("watch");
  });

  it("returns 'ok' more than 15 points below threshold", () => {
    expect(scoreLevel(49, 65)).toBe("ok");
    expect(scoreLevel(0, 65)).toBe("ok");
  });
});
