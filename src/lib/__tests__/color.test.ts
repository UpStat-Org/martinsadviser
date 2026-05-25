import { describe, it, expect } from "vitest";
import { hexToHsl, hexToHslTriplet, isHexColor, readableForegroundTriplet } from "../color";

describe("hexToHsl", () => {
  it("converts a 6-digit hex to HSL", () => {
    expect(hexToHsl("#ff0000")).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHsl("#00ff00")).toEqual({ h: 120, s: 100, l: 50 });
    expect(hexToHsl("#0000ff")).toEqual({ h: 240, s: 100, l: 50 });
  });

  it("expands 3-digit shorthand", () => {
    expect(hexToHsl("#f00")).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHsl("fff")).toEqual({ h: 0, s: 0, l: 100 });
  });

  it("returns null for malformed input", () => {
    expect(hexToHsl("not a color")).toBeNull();
    expect(hexToHsl("#1234")).toBeNull();
    expect(hexToHsl("#zzzzzz")).toBeNull();
  });
});

describe("hexToHslTriplet", () => {
  it("formats as 'H S% L%'", () => {
    expect(hexToHslTriplet("#5B7BFF")).toMatch(/^\d+ \d+% \d+%$/);
  });

  it("returns null when the hex is invalid", () => {
    expect(hexToHslTriplet("bogus")).toBeNull();
  });
});

describe("readableForegroundTriplet", () => {
  it("picks dark text on light backgrounds", () => {
    expect(readableForegroundTriplet("#ffffff")).toBe("0 0% 12%");
    expect(readableForegroundTriplet("#fff5b3")).toBe("0 0% 12%");
  });

  it("picks light text on dark backgrounds", () => {
    expect(readableForegroundTriplet("#000000")).toBe("0 0% 100%");
    expect(readableForegroundTriplet("#1a237e")).toBe("0 0% 100%");
  });

  it("falls back to white when the hex is unreadable", () => {
    expect(readableForegroundTriplet("garbage")).toBe("0 0% 100%");
  });
});

describe("isHexColor", () => {
  it("accepts valid 3- and 6-digit hex codes with or without #", () => {
    expect(isHexColor("#5B7BFF")).toBe(true);
    expect(isHexColor("5b7bff")).toBe(true);
    expect(isHexColor("#fff")).toBe(true);
    expect(isHexColor("  abc  ")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isHexColor("blue")).toBe(false);
    expect(isHexColor("#12")).toBe(false);
    expect(isHexColor("#1234")).toBe(false);
    expect(isHexColor("")).toBe(false);
  });
});
