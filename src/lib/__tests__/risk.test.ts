import { describe, it, expect } from "vitest";
import { RISK_BAND_STYLE, RISK_BANDS, bandLabelKey, compareBandsDesc, factorLabel, isAtRisk } from "../risk";

describe("risk helpers", () => {
  it("orders bands worst-first in RISK_BANDS", () => {
    expect(RISK_BANDS[0]).toBe("critical");
    expect(RISK_BANDS[RISK_BANDS.length - 1]).toBe("low");
  });

  it("isAtRisk returns true for high/critical only", () => {
    expect(isAtRisk("low")).toBe(false);
    expect(isAtRisk("medium")).toBe(false);
    expect(isAtRisk("high")).toBe(true);
    expect(isAtRisk("critical")).toBe(true);
  });

  it("compareBandsDesc puts the worst band first", () => {
    const sorted = (["medium", "critical", "low", "high"] as const).slice().sort(compareBandsDesc);
    expect(sorted).toEqual(["critical", "high", "medium", "low"]);
  });

  it("bandLabelKey returns the i18n key for the band", () => {
    expect(bandLabelKey("critical")).toBe("risk.band.critical");
  });

  it("factorLabel falls back to the raw code when translation is missing", () => {
    const t = (key: string) => key; // pretend nothing is translated
    expect(factorLabel(t, { code: "weirdcode", count: 2, points: 5 })).toBe("weirdcode");
  });

  it("factorLabel interpolates {count} when a translation is present", () => {
    const t = (key: string) => (key === "risk.factor.permit_expired" ? "Permits expired ({count})" : key);
    const label = factorLabel(t, { code: "permit_expired", count: 3, points: 9 });
    expect(label).toBe("Permits expired (3)");
  });

  it("provides badge classes for every band", () => {
    for (const band of RISK_BANDS) {
      expect(RISK_BAND_STYLE[band].badge).toBeTruthy();
      expect(RISK_BAND_STYLE[band].progress).toContain("[&>div]:bg-");
    }
  });
});
