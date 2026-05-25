import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={<span data-testid="icon">i</span>}
        title="Nothing here"
        description="Add your first record"
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add your first record")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("renders the primary action when provided", () => {
    render(
      <EmptyState
        icon={<span>i</span>}
        title="t"
        description="d"
        action={<button>Add new</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Add new" })).toBeInTheDocument();
  });

  it("renders both actions side by side", () => {
    render(
      <EmptyState
        icon={<span>i</span>}
        title="t"
        description="d"
        action={<button>Primary</button>}
        secondaryAction={<button>Secondary</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Secondary" })).toBeInTheDocument();
  });
});
