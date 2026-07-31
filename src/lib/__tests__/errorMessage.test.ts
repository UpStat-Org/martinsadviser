import { describe, it, expect } from "vitest";
import { errorMessage } from "../utils";

describe("errorMessage", () => {
  it("reads .message off an Error", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("passes a thrown string straight through", () => {
    expect(errorMessage("plain failure")).toBe("plain failure");
  });

  it("reads .message off a plain object — Supabase throws these, not Errors", () => {
    expect(errorMessage({ message: "row level security", code: "42501" })).toBe("row level security");
  });

  it("stringifies a non-string message rather than rendering [object Object]", () => {
    expect(errorMessage({ message: 500 })).toBe("500");
  });

  it("falls back for values carrying no message", () => {
    expect(errorMessage(null)).toBe("Unexpected error");
    expect(errorMessage(undefined)).toBe("Unexpected error");
    expect(errorMessage({ code: "42501" })).toBe("Unexpected error");
  });
});
