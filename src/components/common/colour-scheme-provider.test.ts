// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  ColourSchemeProvider,
  colourSchemeScript,
  colourSchemeStorageKey,
  useColourScheme,
} from "./colour-scheme-provider";

// The colour scheme script only matters during SSR and needs a router.
vi.mock("@tanstack/react-router", () => ({ ScriptOnce: () => null }));

/** A stand-in for the OS `prefers-color-scheme: dark` query. */
function fakeColorScheme(initiallyDark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: initiallyDark,
    addEventListener: (_type: string, listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: () => void) => {
      listeners.delete(listener);
    },
  };
  window.matchMedia = vi.fn(() => query as unknown as MediaQueryList);
  return {
    change(dark: boolean) {
      query.matches = dark;
      for (const listener of listeners) listener();
    },
  };
}

function ColourSchemeProbe() {
  const { colourScheme } = useColourScheme();
  return createElement(
    "span",
    { "data-testid": "colour-scheme" },
    colourScheme,
  );
}

function renderWithColourScheme() {
  render(
    createElement(ColourSchemeProvider, null, createElement(ColourSchemeProbe)),
  );
  return () => screen.getByTestId("colour-scheme").textContent;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

afterEach(cleanup);

it("follows an OS colour-scheme change while the preference is system", () => {
  const colorScheme = fakeColorScheme(false);
  const colourScheme = renderWithColourScheme();
  expect(colourScheme()).toBe("light");

  act(() => colorScheme.change(true));

  expect(colourScheme()).toBe("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

it("keeps the saved choice under the legacy storage key", () => {
  expect(colourSchemeStorageKey).toBe("ui-theme");
});

it("applies the saved choice before first paint through the same key", () => {
  fakeColorScheme(false);
  localStorage.setItem(colourSchemeStorageKey, "dark");

  // The inline script is a string by design; run it the way a browser would.
  // oxlint-disable-next-line typescript/no-implied-eval
  new Function(colourSchemeScript)();

  const classes = document.documentElement.classList;
  expect(classes.contains("dark")).toBe(true);
  expect(classes.contains("system")).toBe(false);
});
