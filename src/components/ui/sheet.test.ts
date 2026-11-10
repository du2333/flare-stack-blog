// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, Fragment, useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { Sheet } from "./sheet";

// Unmount as soon as it closes; exit motion is not under test.
vi.mock("@/hooks/use-motion", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-motion")>()),
  useMotionPresence: (open: boolean) => open,
}));

afterEach(cleanup);

function Harness({ modal = true }: { modal?: boolean }) {
  const [open, setOpen] = useState(false);
  return createElement(
    "div",
    null,
    createElement("button", { onClick: () => setOpen(true) }, "Open"),
    createElement(Sheet, {
      open,
      onClose: () => setOpen(false),
      modal,
      initialFocus: () => document.getElementById("first"),
      "aria-label": "Panel",
      children: createElement(
        Fragment,
        null,
        createElement("button", { id: "first" }, "First"),
        createElement(
          "button",
          {
            "aria-haspopup": "listbox",
            "aria-expanded": "false",
            id: "picker",
          },
          "Picker",
        ),
      ),
    }),
  );
}

function openSheet(modal?: boolean) {
  render(createElement(Harness, { modal }));
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

it("moves focus in on open and back on Escape", () => {
  const opener = openSheet();

  expect(screen.getByRole("dialog", { name: "Panel" })).toBeTruthy();
  expect(document.activeElement?.id).toBe("first");
  expect(document.documentElement.style.overflow).toBe("hidden");

  fireEvent.keyDown(document.activeElement!, { key: "Escape" });

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(opener);
  expect(document.documentElement.style.overflow).toBe("");
});

it("closes from its backdrop", () => {
  openSheet();

  fireEvent.click(document.querySelector(".fuwari-sheet-backdrop")!);

  expect(screen.queryByRole("dialog")).toBeNull();
});

it("leaves Escape to a popup open inside it", () => {
  openSheet();
  const picker = document.getElementById("picker")!;
  picker.setAttribute("aria-expanded", "true");

  fireEvent.keyDown(picker, { key: "Escape" });

  expect(screen.getByRole("dialog")).toBeTruthy();
});

it("rises from the bottom edge when its side is bottom", () => {
  render(
    createElement(Sheet, {
      open: true,
      onClose: () => {},
      side: "bottom",
      "aria-label": "Panel",
      children: createElement("button", null, "First"),
    }),
  );

  expect(
    screen.getByRole("dialog", { name: "Panel" }).getAttribute("data-side"),
  ).toBe("bottom");
});

it("keeps the page usable when non-modal", () => {
  openSheet(false);

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.querySelector(".fuwari-sheet-backdrop")).toBeNull();
  expect(document.documentElement.style.overflow).toBe("");
  expect(document.activeElement?.id).toBe("first");
});
