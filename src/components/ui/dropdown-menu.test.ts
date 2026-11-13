// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, expect, it, vi } from "vitest";
import DropdownMenu from "./dropdown-menu";

// Unmount the menu as soon as it closes; exit motion is not under test.
vi.mock("@/hooks/use-motion", () => ({
  MOTION: { popover: 120 },
  useMotionPresence: (open: boolean) => open,
}));

const OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Title", value: "title" },
];

afterEach(cleanup);

function renderMenu(onChange = vi.fn()) {
  render(
    createElement(DropdownMenu, {
      value: "oldest",
      options: OPTIONS,
      onChange,
      ariaLabel: "Sort",
    }),
  );
  return onChange;
}

function trigger() {
  return screen.getByRole("button", { name: "Sort" });
}

it("opens on the chosen option and moves through the options by key", async () => {
  renderMenu();
  fireEvent.click(trigger());

  const oldest = await findInPopover("menuitemradio", { name: "Oldest" });
  expect(oldest.getAttribute("aria-checked")).toBe("true");
  expect(document.activeElement).toBe(oldest);

  fireEvent.keyDown(oldest, { key: "ArrowDown" });
  expect(document.activeElement?.textContent).toBe("Title");
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(document.activeElement?.textContent).toBe("Newest");
  fireEvent.keyDown(document.activeElement!, { key: "End" });
  expect(document.activeElement?.textContent).toBe("Title");
  fireEvent.keyDown(document.activeElement!, { key: "n" });
  expect(document.activeElement?.textContent).toBe("Newest");
});

it("closes on Escape and returns focus to the trigger", async () => {
  const onChange = renderMenu();
  fireEvent.click(trigger());
  const menu = await findInPopover("menu", { name: "Sort" });

  fireEvent.keyDown(document.activeElement!, { key: "Escape" });

  expect(screen.queryByRole("menu")).toBeNull();
  expect(menu.isConnected).toBe(false);
  expect(document.activeElement).toBe(trigger());
  expect(onChange).not.toHaveBeenCalled();
});

it("closes on a click outside but not on one inside", async () => {
  const onChange = renderMenu();
  fireEvent.click(trigger());
  const menu = await findInPopover("menu");

  fireEvent.mouseDown(menu);
  expect(menu.isConnected).toBe(true);

  fireEvent.mouseDown(document.body);
  expect(menu.isConnected).toBe(false);
  expect(onChange).not.toHaveBeenCalled();
});

it("picks an option and returns focus to the trigger", async () => {
  const onChange = renderMenu();
  fireEvent.click(trigger());

  fireEvent.click(await findInPopover("menuitemradio", { name: "Title" }));

  expect(onChange).toHaveBeenCalledWith("title");
  expect(screen.queryByRole("menu")).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

it("lifts the width cap when the menu is as wide as its trigger", async () => {
  render(
    createElement(DropdownMenu, {
      value: "oldest",
      options: OPTIONS,
      onChange: vi.fn(),
      ariaLabel: "Sort",
      matchTriggerWidth: true,
    }),
  );
  fireEvent.click(trigger());

  const menu = await findInPopover("menu");

  expect(menu.classList.contains("max-w-72")).toBe(false);
});
