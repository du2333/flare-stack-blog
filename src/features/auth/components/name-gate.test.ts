// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NameGate } from "./name-gate";

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children,
  useRouterState: ({
    select,
  }: {
    select: (state: { matches: Array<{ routeId: string }> }) => boolean;
  }) => select({ matches: [{ routeId: "/_public/posts" }] }),
}));
// react-hook-form and the real form are not what the gate decides on.
vi.mock("./public-name-form", () => ({
  PublicNameForm: () => createElement("form", { "aria-label": "name form" }),
}));

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const gate = (user: { name: string } | undefined) =>
  createElement(NameGate, { user, logout: vi.fn() });

it("opens the form for a signed-in visitor with an empty name", async () => {
  render(gate({ name: " " }));

  expect(await screen.findByLabelText("name form")).toBeTruthy();
});

it("leaves the form out while the gate stays shut", async () => {
  const { rerender } = render(gate(undefined));
  rerender(gate({ name: "Reader" }));
  await Promise.resolve();

  expect(screen.queryByLabelText("name form")).toBeNull();
});
