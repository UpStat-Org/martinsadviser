import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLocalStorageState } from "../useLocalStorageState";

describe("useLocalStorageState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hydrates from the initial value when storage is empty", () => {
    const { result } = renderHook(() => useLocalStorageState("k", { tab: "home" }));
    expect(result.current[0]).toEqual({ tab: "home" });
  });

  it("persists writes to localStorage", () => {
    const { result } = renderHook(() => useLocalStorageState<number>("count", 0));
    act(() => result.current[1](3));
    expect(JSON.parse(localStorage.getItem("count") || "null")).toBe(3);
  });

  it("reads a previously persisted value on mount", () => {
    localStorage.setItem("greeting", JSON.stringify("hola"));
    const { result } = renderHook(() => useLocalStorageState("greeting", "hello"));
    expect(result.current[0]).toBe("hola");
  });

  it("falls back to initial when storage holds malformed JSON", () => {
    localStorage.setItem("broken", "{not json");
    const { result } = renderHook(() => useLocalStorageState("broken", 7));
    expect(result.current[0]).toBe(7);
  });

  it("picks up writes from other tabs via the storage event", () => {
    const { result } = renderHook(() => useLocalStorageState<string>("lang", "pt"));
    act(() => {
      const event = new StorageEvent("storage", {
        key: "lang",
        newValue: JSON.stringify("en"),
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });
    expect(result.current[0]).toBe("en");
  });

  it("resets to the initial value when another tab removes the key", () => {
    const { result } = renderHook(() => useLocalStorageState<string>("lang", "pt"));
    act(() => result.current[1]("es"));
    act(() => {
      const event = new StorageEvent("storage", {
        key: "lang",
        newValue: null,
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });
    expect(result.current[0]).toBe("pt");
  });

  it("ignores storage events for unrelated keys", () => {
    const { result } = renderHook(() => useLocalStorageState<string>("lang", "pt"));
    act(() => {
      const event = new StorageEvent("storage", {
        key: "something-else",
        newValue: JSON.stringify("en"),
        storageArea: localStorage,
      });
      window.dispatchEvent(event);
    });
    expect(result.current[0]).toBe("pt");
  });
});
