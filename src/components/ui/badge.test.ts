// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Badge } from "./badge";

afterEach(cleanup);

it("is only its label without a remove handler", () => {
  render(createElement(Badge, null, "Draft"));

  expect(screen.getByText("Draft").getAttribute("data-removable")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});

it("becomes a chip with a named remove button when it can be removed", () => {
  const onRemove = vi.fn();
  render(
    createElement(Badge, { onRemove, removeLabel: "Remove Rust" }, "Rust"),
  );

  const remove = screen.getByRole("button", { name: "Remove Rust" });
  expect(remove.closest(".fuwari-badge")?.getAttribute("data-removable")).toBe(
    "",
  );
  fireEvent.click(remove);
  expect(onRemove).toHaveBeenCalledOnce();
});
