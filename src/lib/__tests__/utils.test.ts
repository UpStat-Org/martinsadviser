import { describe, it, expect } from "vitest";
import { cn, sanitizeSearchTerm } from "../utils";

describe("cn (classname merge)", () => {
  it("merges multiple class strings", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves tailwind conflicts (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    const show = false;
    expect(cn("base", show && "hidden", "extra")).toBe("base extra");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });

  it("returns empty string when called with no args", () => {
    expect(cn()).toBe("");
  });
});

describe("sanitizeSearchTerm", () => {
  it("strips PostgREST-syntax characters that would corrupt an OR filter", () => {
    expect(sanitizeSearchTerm("ab,cd")).toBe("abcd");
    expect(sanitizeSearchTerm("a.b(c)")).toBe("abc");
    expect(sanitizeSearchTerm("a*b\\c")).toBe("abc");
  });

  it("strips SQL ILIKE wildcards so user input matches literally", () => {
    expect(sanitizeSearchTerm("100%_safe")).toBe("100safe");
  });

  it("trims surrounding whitespace", () => {
    expect(sanitizeSearchTerm("  acme  ")).toBe("acme");
  });

  it("returns an empty string when nothing survives sanitization", () => {
    expect(sanitizeSearchTerm(",.()*\\%_")).toBe("");
  });

  it("passes safe terms through unchanged", () => {
    expect(sanitizeSearchTerm("Acme Trucks 123")).toBe("Acme Trucks 123");
  });
});
