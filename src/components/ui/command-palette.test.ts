// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FileText, Plus } from "lucide-react";
import { createElement, useState } from "react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  type Command,
  CommandPalette,
  filterCommands,
} from "./command-palette";

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const runs = { new: vi.fn(), posts: vi.fn(), media: vi.fn() };
const COMMANDS: Array<Command> = [
  {
    id: "new",
    group: "Write",
    label: "New post",
    keywords: "create",
    icon: Plus,
    run: runs.new,
  },
  {
    id: "posts",
    group: "Go to",
    label: "Posts",
    hint: "Content",
    icon: FileText,
    run: runs.posts,
  },
  {
    id: "media",
    group: "Go to",
    label: "Media",
    hint: "Content",
    icon: FileText,
    run: runs.media,
  },
];

/** A page with a button that opens the palette, as the shell's search does. */
function Page() {
  const [open, setOpen] = useState(false);
  return createElement(
    "div",
    null,
    createElement(
      "button",
      { type: "button", onClick: () => setOpen(true) },
      "Open",
    ),
    createElement(CommandPalette, {
      open,
      onClose: () => setOpen(false),
      commands: COMMANDS,
      label: "Search and go to",
      placeholder: "Search",
      empty: (query: string) => `Nothing matches ${query}`,
      closeKey: "esc",
      selectHint: "Select",
      runHint: "Open",
    }),
  );
}

function open() {
  render(createElement(Page));
  const trigger = screen.getByRole("button", { name: "Open" });
  trigger.focus();
  fireEvent.click(trigger);
  return { trigger, field: screen.getByRole("combobox", { name: "Search" }) };
}

const options = () =>
  screen.getAllByRole("option").map((option) => option.textContent);
const active = () =>
  screen
    .getAllByRole("option")
    .find((option) => option.getAttribute("aria-selected") === "true")
    ?.textContent;

it("matches the label, the hint and the keywords", () => {
  expect(filterCommands(COMMANDS, "  ").map((c) => c.id)).toEqual([
    "new",
    "posts",
    "media",
  ]);
  expect(filterCommands(COMMANDS, "CREATE").map((c) => c.id)).toEqual(["new"]);
  expect(filterCommands(COMMANDS, "content").map((c) => c.id)).toEqual([
    "posts",
    "media",
  ]);
});

it("opens on the field, lists the commands under their groups and filters as one types", () => {
  const { field } = open();
  expect(document.activeElement).toBe(field);
  expect(
    screen.getByRole("dialog", { name: "Search and go to" }),
  ).toBeDefined();
  expect(options()).toEqual(["New post", "PostsContent", "MediaContent"]);
  expect(
    [...document.querySelectorAll(".fuwari-palette-group")].map(
      (g) => g.textContent,
    ),
  ).toEqual(["Write", "Go to"]);

  fireEvent.change(field, { target: { value: "med" } });
  expect(options()).toEqual(["MediaContent"]);
  fireEvent.change(field, { target: { value: "zzz" } });
  expect(screen.queryAllByRole("option")).toEqual([]);
  expect(screen.getByText("Nothing matches zzz")).toBeDefined();
});

it("moves with the arrows, wrapping around, and runs the active one on Enter", () => {
  const { field } = open();
  expect(active()).toBe("New post");
  fireEvent.keyDown(field, { key: "ArrowDown" });
  expect(active()).toBe("PostsContent");
  expect(field.getAttribute("aria-activedescendant")).toBe(
    screen.getAllByRole("option")[1]!.id,
  );
  fireEvent.keyDown(field, { key: "ArrowUp" });
  fireEvent.keyDown(field, { key: "ArrowUp" });
  expect(active()).toBe("MediaContent");
  fireEvent.keyDown(field, { key: "Enter" });
  expect(runs.media).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("closes on Escape and on a click outside, and gives focus back to where it was", () => {
  const { trigger, field } = open();
  fireEvent.keyDown(field, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);

  fireEvent.click(trigger);
  fireEvent.mouseDown(document.querySelector(".fuwari-palette-scrim")!);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("runs a command that is clicked", () => {
  open();
  fireEvent.click(screen.getByRole("option", { name: /^Posts/ }));
  expect(runs.posts).toHaveBeenCalledOnce();
  expect(screen.queryByRole("dialog")).toBeNull();
});
