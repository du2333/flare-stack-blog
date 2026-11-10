// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MermaidDiagram } from "./mermaid-diagram";

const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock("mermaid", () => ({ default: mermaid }));

const SOURCE = "flowchart LR\n  A --> B";

beforeEach(() => {
  mermaid.initialize.mockReset();
  mermaid.render.mockReset();
  mermaid.render.mockResolvedValue({
    svg: '<svg data-testid="diagram"><text>A to B</text></svg>',
  });
});

afterEach(cleanup);

it("shows the source before the diagram renders", () => {
  render(
    createElement(MermaidDiagram, { source: SOURCE, colourScheme: "light" }),
  );

  expect(screen.getByText(/A --> B/).textContent).toBe(SOURCE);
  expect(screen.queryByTestId("diagram")).toBeNull();
});

it("renders with the strict, base-themed Mermaid config", async () => {
  render(
    createElement(MermaidDiagram, { source: SOURCE, colourScheme: "light" }),
  );
  await screen.findByTestId("diagram");

  expect(mermaid.initialize).toHaveBeenCalledWith(
    expect.objectContaining({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
    }),
  );
});

it("re-renders with the dark Mermaid theme variables when the colour scheme changes", async () => {
  const { rerender } = render(
    createElement(MermaidDiagram, { source: SOURCE, colourScheme: "light" }),
  );
  await screen.findByTestId("diagram");
  expect(mermaid.initialize).toHaveBeenLastCalledWith(
    expect.objectContaining({
      themeVariables: expect.objectContaining({ darkMode: false }),
    }),
  );

  mermaid.render.mockResolvedValue({
    svg: '<svg data-testid="dark-diagram"></svg>',
  });
  rerender(
    createElement(MermaidDiagram, { source: SOURCE, colourScheme: "dark" }),
  );

  expect(await screen.findByTestId("dark-diagram")).toBeDefined();
  expect(mermaid.initialize).toHaveBeenLastCalledWith(
    expect.objectContaining({
      themeVariables: expect.objectContaining({ darkMode: true }),
    }),
  );
  expect(mermaid.render).toHaveBeenCalledTimes(2);
});

it("replaces the source with the rendered diagram", async () => {
  render(
    createElement(MermaidDiagram, { source: SOURCE, colourScheme: "light" }),
  );

  expect(await screen.findByTestId("diagram")).toBeDefined();
  expect(mermaid.render).toHaveBeenCalledWith(
    expect.any(String),
    SOURCE,
    expect.any(HTMLElement),
  );
  expect(screen.queryByText(/A --> B/)).toBeNull();
});

it("keeps the source and shows the error when the syntax is invalid", async () => {
  mermaid.render.mockRejectedValue(
    new Error("Parse error on line 2: Expecting 'SEMI', got 'EOF'"),
  );

  render(
    createElement(MermaidDiagram, { source: SOURCE, colourScheme: "light" }),
  );

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Parse error on line 2");
  expect(screen.getByText(/A --> B/).textContent).toBe(SOURCE);
  expect(screen.queryByTestId("diagram")).toBeNull();
});

it("measures the diagram off the page so the window never scrolls", async () => {
  render(
    createElement(MermaidDiagram, { source: SOURCE, colourScheme: "light" }),
  );
  await screen.findByTestId("diagram");

  const container = mermaid.render.mock.calls[0]?.[2] as
    | HTMLElement
    | undefined;
  expect(container?.isConnected).toBe(true);
  expect(container?.style.position).toBe("fixed");
  expect(container?.getAttribute("aria-hidden")).toBe("true");
});
