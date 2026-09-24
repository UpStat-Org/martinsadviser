import { describe, expect, it } from "vitest";
import { normalizeMapCountry, normalizeMapRegion } from "../index";

describe("map normalization", () => {
  it("recognizes countries from codes and names", () => {
    expect(normalizeMapCountry("BR")).toBe("BR");
    expect(normalizeMapCountry("Brasil")).toBe("BR");
    expect(normalizeMapCountry("España")).toBe("ES");
  });

  it("normalizes Brazilian state codes, names, and ISO forms", () => {
    expect(normalizeMapRegion("BR", "SP")).toBe("SP");
    expect(normalizeMapRegion("BR", "BR-SP")).toBe("SP");
    expect(normalizeMapRegion("BR", "São Paulo")).toBe("SP");
    expect(normalizeMapRegion("BR", "Distrito Federal (DF)")).toBe("DF");
  });

  it("normalizes Spanish region codes, names, and ISO forms", () => {
    expect(normalizeMapRegion("ES", "ES-MD")).toBe("MD");
    expect(normalizeMapRegion("ES", "Madrid")).toBe("MD");
    expect(normalizeMapRegion("ES", "Andalucía")).toBe("AN");
  });
});
