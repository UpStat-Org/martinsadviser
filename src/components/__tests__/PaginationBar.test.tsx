import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaginationBar } from "../PaginationBar";

describe("PaginationBar", () => {
  it("renders nothing when there's only one page", () => {
    const { container } = render(<PaginationBar page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows current page / total", () => {
    render(<PaginationBar page={2} totalPages={7} onPageChange={() => {}} />);
    expect(screen.getByText("2 / 7")).toBeInTheDocument();
  });

  it("disables Previous on the first page", () => {
    render(<PaginationBar page={1} totalPages={5} onPageChange={() => {}} />);
    const [prev, next] = screen.getAllByRole("button");
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();
  });

  it("disables Next on the last page", () => {
    render(<PaginationBar page={5} totalPages={5} onPageChange={() => {}} />);
    const [prev, next] = screen.getAllByRole("button");
    expect(prev).not.toBeDisabled();
    expect(next).toBeDisabled();
  });

  it("emits onPageChange with the new page", () => {
    const onPageChange = vi.fn();
    render(<PaginationBar page={3} totalPages={5} onPageChange={onPageChange} />);
    const [prev, next] = screen.getAllByRole("button");
    fireEvent.click(prev);
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenNthCalledWith(1, 2);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 4);
  });
});
