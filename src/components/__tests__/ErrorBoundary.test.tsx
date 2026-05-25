import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("kaboom");
}

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>hello</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders the fallback UI and logs the error when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );
      expect(screen.getByText("kaboom")).toBeInTheDocument();
      // The boundary's own componentDidCatch logs the error with this prefix.
      const ourLog = spy.mock.calls.find((call) => String(call[0]).includes("[ErrorBoundary]"));
      expect(ourLog).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });
});
