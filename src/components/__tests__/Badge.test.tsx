import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../ui/badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Badge>Test</Badge>);
    const badge = screen.getByText("Test");
    expect(badge).toHaveClass("bg-primary");
  });

  it("applies destructive variant", () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText("Error");
    expect(badge).toHaveClass("bg-destructive");
  });

  it("applies outline variant", () => {
    render(<Badge variant="outline">Outline</Badge>);
    const badge = screen.getByText("Outline");
    expect(badge).toHaveClass("text-foreground");
  });

  it("merges custom className", () => {
    render(<Badge className="my-custom">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("my-custom");
  });
});
