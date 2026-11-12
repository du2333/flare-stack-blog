// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { m } from "@/paraglide/messages";
import { ThemePreviewBar } from "./theme-preview-bar";

afterEach(cleanup);

it("names the previewed Theme and leaves the preview", () => {
  const onExit = vi.fn();
  render(createElement(ThemePreviewBar, { themeName: "Fixture", onExit }));

  const bar = screen.getByRole("complementary", {
    name: m.theme_preview_bar_label(),
  });
  expect(bar.textContent).toContain(m.theme_preview_bar({ name: "Fixture" }));
  fireEvent.click(screen.getByRole("button", { name: m.theme_preview_exit() }));
  expect(onExit).toHaveBeenCalledOnce();
});

// The bar renders outside the shell and knows no Theme: a shell that keeps
// a part of the window for a frame of its own says how much, and the bar is
// centred in the rest (theme-shell.ts).
it("is centred in the window, or in what the shell's frame leaves of it", () => {
  const css = readFileSync(
    join(import.meta.dirname, "theme-preview-bar.css"),
    "utf8",
  )
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\( /g, "(")
    .replace(/ \)/g, ")");
  const declared = (name: string) =>
    css.match(new RegExp(`[;{] ${name}: ([^;]+);`))![1];

  // Without a shell that says otherwise: the whole window.
  expect(declared("--preview-inset-left")).toBe(
    "var(--shell-content-inset-left, 0px)",
  );
  expect(declared("--preview-inset-right")).toBe(
    "var(--shell-content-inset-right, 0px)",
  );
  expect(declared("position")).toBe("fixed");
  expect(declared("left")).toBe(
    "calc(var(--preview-inset-left) + (100% - var(--preview-inset-left) - var(--preview-inset-right)) / 2)",
  );
  expect(declared("transform")).toBe("translateX(-50%)");
  // Never wider than that room, 16px clear of either end of it.
  expect(declared("width")).toBe(
    "min(560px, calc(100vw - var(--preview-inset-left) - var(--preview-inset-right) - 32px))",
  );
  // And it names no Theme and no width of one.
  expect(css).not.toMatch(/data-theme|@media/);
});
