// @vitest-environment jsdom
import type { JSONContent } from "@tiptap/react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

const mermaid = vi.hoisted(() => ({
  loaded: vi.fn(),
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock("mermaid", () => {
  mermaid.loaded();
  return { default: mermaid };
});

vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => ({ colourScheme: "light" }),
}));

const SOURCE = "flowchart LR\n  A --> B";

function codeBlock(language: string, code: string, highlightedHtml?: string) {
  return {
    type: "codeBlock",
    attrs: { language, highlightedHtml },
    content: [{ type: "text", text: code }],
  };
}

function doc(...content: Array<JSONContent>): JSONContent {
  return { type: "doc", content };
}

// A fresh module graph per test, so whether Mermaid loads is observable.
async function renderContent(content: JSONContent) {
  const { ContentRenderer } = await import("./content-renderer");
  return render(createElement(ContentRenderer, { content }));
}

// Lazy components and the effects they mount import in turn; settle each step.
async function settleLazyImports() {
  for (let step = 0; step < 3; step += 1) {
    await act(() => vi.dynamicImportSettled());
  }
}

// The first import transforms the renderer's modules; keep it out of the tests.
beforeAll(() => import("./content-renderer"), 60_000);

beforeEach(() => {
  vi.resetModules();
  mermaid.loaded.mockClear();
  mermaid.initialize.mockReset();
  mermaid.render.mockReset();
  mermaid.render.mockResolvedValue({
    svg: '<svg data-testid="diagram"></svg>',
  });
});

afterEach(cleanup);

it("hands mermaid code blocks to MermaidDiagram, showing the highlighted source first", async () => {
  const { container } = await renderContent(
    doc(
      codeBlock(
        "mermaid",
        SOURCE,
        '<pre class="shiki"><code><span>flowchart LR</span></code></pre>',
      ),
    ),
  );

  expect(container.querySelector("pre.shiki")).not.toBeNull();
  expect(await screen.findByTestId("diagram")).toBeDefined();
  expect(mermaid.render).toHaveBeenCalledWith(
    expect.any(String),
    SOURCE,
    expect.any(HTMLElement),
  );
  expect(container.querySelector("pre.shiki")).toBeNull();
});

it("renders other code blocks unchanged without loading Mermaid", async () => {
  const highlighted =
    '<pre class="shiki"><code><span>const a = 1;</span></code></pre>';
  const { container } = await renderContent(
    doc(codeBlock("ts", "const a = 1;", highlighted)),
  );
  await settleLazyImports();

  expect(screen.getByText("TypeScript")).toBeDefined();
  expect(container.querySelector("pre.shiki")?.outerHTML).toBe(highlighted);
  expect(mermaid.loaded).not.toHaveBeenCalled();
  expect(mermaid.render).not.toHaveBeenCalled();
});

it("renders Mermaid diagrams in a post that also has math", async () => {
  await renderContent(
    doc(
      { type: "blockMath", attrs: { latex: "E=mc^2" } },
      codeBlock("Mermaid", SOURCE),
    ),
  );

  expect(await screen.findByTestId("diagram")).toBeDefined();
  expect(mermaid.render).toHaveBeenCalledWith(
    expect.any(String),
    SOURCE,
    expect.any(HTMLElement),
  );
});
