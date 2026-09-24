import { describe, expect, it } from "vitest";
import { inferMapCountryFromRegion, normalizeMapCountry, normalizeMapRegion, permitMapCountry } from "../index";

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

  it("recovers legacy permits whose client has the wrong default country", () => {
    expect(permitMapCountry("US", "SP")).toBe("BR");
    expect(permitMapCountry("US", "São Paulo")).toBe("BR");
    expect(permitMapCountry("US", "ES-MD")).toBe("ES");
    // MD is valid for both Maryland and Madrid. Without an ES prefix or a
    // Spanish client, preserving the stored country is safer than guessing.
    expect(permitMapCountry("US", "MD")).toBe("US");
    expect(inferMapCountryFromRegion("ES-MD")).toBe("ES");
  });
});
