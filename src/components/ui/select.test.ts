// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { findInPopover } from "tests/popover";
import { afterEach, expect, it, vi } from "vitest";
import { Select } from "./select";

// Unmount the list as soon as it closes; exit motion is not under test.
vi.mock("@/hooks/use-motion", () => ({
  MOTION: { popover: 120 },
  useMotionPresence: (open: boolean) => open,
}));

const OPTIONS = [
  { label: "Telegram", value: "telegram" },
  { label: "Slack", value: "slack" },
  { label: "Email", value: "email", disabled: true },
  { label: "Discord", value: "discord" },
];

afterEach(cleanup);

function renderSelect(onChange = vi.fn()) {
  render(
    createElement(
      "div",
      null,
      createElement(Select, {
        "aria-label": "Provider",
        value: "slack",
        options: OPTIONS,
        onChange,
      }),
      createElement("button", { type: "button" }, "After"),
    ),
  );
  return onChange;
}

function trigger() {
  return screen.getByRole("button", { name: "Provider" });
}

function focused() {
  return document.activeElement?.textContent;
}

it("opens with focus on the chosen option, in a named list with one tab stop", async () => {
  renderSelect();
  fireEvent.click(trigger());

  const slack = await findInPopover("option", { name: "Slack" });
  expect(slack.getAttribute("aria-selected")).toBe("true");
  expect(document.activeElement).toBe(slack);
  expect(screen.getByRole("listbox", { name: "Provider" })).not.toBeNull();
  // Arrows move between the options; Tab does not.
  for (const option of screen.getAllByRole("option"))
    expect(option.tabIndex).toBe(-1);
});

it("moves focus by arrows, Home, End and a typed letter, past a disabled option", async () => {
  renderSelect();
  fireEvent.click(trigger());
  const slack = await findInPopover("option", { name: "Slack" });

  fireEvent.keyDown(slack, { key: "ArrowDown" });
  expect(focused()).toBe("Discord");
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(focused()).toBe("Telegram");
  fireEvent.keyDown(document.activeElement!, { key: "End" });
  expect(focused()).toBe("Discord");
  fireEvent.keyDown(document.activeElement!, { key: "Home" });
  expect(focused()).toBe("Telegram");
  fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
  expect(focused()).toBe("Discord");
  fireEvent.keyDown(document.activeElement!, { key: "s" });
  expect(focused()).toBe("Slack");
  // No enabled option starts with it: focus stays.
  fireEvent.keyDown(document.activeElement!, { key: "e" });
  expect(focused()).toBe("Slack");
});

it("opens from the trigger on ArrowDown or ArrowUp", async () => {
  renderSelect();
  fireEvent.keyDown(trigger(), { key: "ArrowDown" });
  expect(await findInPopover("option", { name: "Slack" })).toBe(
    document.activeElement,
  );
});

it("picks the focused option, closes and returns focus to the trigger", async () => {
  const onChange = renderSelect();
  fireEvent.click(trigger());
  const slack = await findInPopover("option", { name: "Slack" });
  fireEvent.keyDown(slack, { key: "ArrowDown" });

  // Enter and Space on a focused button are its click.
  fireEvent.click(document.activeElement!);

  expect(onChange).toHaveBeenCalledExactlyOnceWith("discord");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

it("closes on Escape without a change, back onto the trigger", async () => {
  const onChange = renderSelect();
  fireEvent.click(trigger());
  const slack = await findInPopover("option", { name: "Slack" });
  fireEvent.keyDown(slack, { key: "ArrowDown" });

  fireEvent.keyDown(document.activeElement!, { key: "Escape" });

  expect(screen.queryByRole("listbox")).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(trigger());
});

it("closes on Tab, so focus moves on from the trigger", async () => {
  renderSelect();
  fireEvent.click(trigger());
  const slack = await findInPopover("option", { name: "Slack" });

  fireEvent.keyDown(slack, { key: "Tab" });

  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(trigger());
});

it("takes its list's name from the trigger when a label names that", async () => {
  render(
    createElement(
      "div",
      null,
      createElement("label", { htmlFor: "provider" }, "Provider"),
      createElement(Select, {
        id: "provider",
        value: "slack",
        options: OPTIONS,
        onChange: vi.fn(),
      }),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: /Provider/ }));
  await findInPopover("option", { name: "Slack" });

  expect(screen.getByRole("listbox").getAttribute("aria-labelledby")).toBe(
    "provider",
  );
});
