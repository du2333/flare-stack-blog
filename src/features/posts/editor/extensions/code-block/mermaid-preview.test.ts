// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Editor, EditorContent } from "@tiptap/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ColourScheme } from "@/components/common/colour-scheme-provider";
import { createSchemaExtensions } from "@/features/posts/editor/schema";
import { CodeBlockExtension } from ".";

vi.mock("@/hooks/use-motion", () => ({
  MOTION: { popover: 120 },
  useMotionPresence: (open: boolean) => open,
}));

const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock("mermaid", () => ({ default: mermaid }));

const scheme = vi.hoisted(() => ({ colourScheme: "light" as ColourScheme }));

vi.mock("@/components/common/colour-scheme-provider", () => ({
  useColourScheme: () => scheme,
}));

const SOURCE = "flowchart LR\n  A --> B";

let editor: Editor | undefined;

// ProseMirror measures ranges to scroll the caret into view; jsdom has no layout.
Range.prototype.getClientRects ??= () =>
  [] as unknown as ReturnType<Range["getClientRects"]>;
Range.prototype.getBoundingClientRect ??= () => new DOMRect();
document.elementFromPoint ??= () => null;

beforeEach(() => {
  scheme.colourScheme = "light";
  mermaid.initialize.mockReset();
  mermaid.render.mockReset();
  mermaid.render.mockResolvedValue({
    svg: '<svg data-testid="diagram"><text>A to B</text></svg>',
  });
});

afterEach(() => {
  cleanup();
  editor?.destroy();
  editor = undefined;
});

async function renderCodeBlock(
  language: string,
  code: string,
  { editable = true } = {},
) {
  const target = new Editor({
    extensions: createSchemaExtensions({ codeBlock: CodeBlockExtension }),
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
        {
          type: "codeBlock",
          attrs: { language },
          content: code ? [{ type: "text", text: code }] : undefined,
        },
      ],
    },
    editable,
  });
  editor = target;
  await act(async () => {
    render(createElement(EditorContent, { editor: target }));
  });
  // jsdom only focuses elements with a tabindex, not contenteditable ones.
  target.view.dom.tabIndex = 0;
  return target;
}

/** The editable source is hidden with a class while a preview shows. */
function sourceIsVisible() {
  const pre = document.querySelector("pre:has(> [data-node-view-content])");
  return pre !== null && !pre.classList.contains("hidden");
}

it("shows a Mermaid block at rest as the rendered diagram", async () => {
  await renderCodeBlock("mermaid", SOURCE);

  expect(await screen.findByTestId("diagram")).toBeDefined();
  expect(mermaid.render).toHaveBeenCalledWith(
    expect.any(String),
    SOURCE,
    expect.any(HTMLElement),
  );
  expect(sourceIsVisible()).toBe(false);
});

it("enters source editing when the Admin clicks the diagram", async () => {
  const target = await renderCodeBlock("mermaid", SOURCE);
  const diagram = await screen.findByTestId("diagram");

  await act(async () => {
    fireEvent.mouseDown(diagram, { button: 0 });
  });

  // Tiptap focuses on the next animation frame.
  await waitFor(() => expect(target.isFocused).toBe(true));
  const { from } = target.state.selection;
  // "Intro" fills 0–7, so the block's source starts at 8.
  expect(from).toBeGreaterThanOrEqual(8);
  expect(from).toBeLessThanOrEqual(8 + SOURCE.length);
  expect(screen.queryByTestId("diagram")).toBeNull();
  expect(sourceIsVisible()).toBe(true);
});

it("shows a syntax error inside the block and still opens the source", async () => {
  mermaid.render.mockRejectedValue(
    new Error("Parse error on line 2: Expecting 'SEMI', got 'EOF'"),
  );
  const target = await renderCodeBlock("mermaid", SOURCE);

  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("Parse error on line 2");
  expect(alert.closest("[data-node-view-wrapper]")).not.toBeNull();
  // The source stays readable beside the error, not only in the hidden editor.
  const preview = alert.parentElement as HTMLElement;
  expect(within(preview).getByText(/A --> B/).textContent).toBe(SOURCE);

  await act(async () => {
    fireEvent.mouseDown(alert, { button: 0 });
  });

  await waitFor(() => expect(target.isFocused).toBe(true));
  expect(sourceIsVisible()).toBe(true);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("re-renders the diagram from the edited source after the Admin leaves the block", async () => {
  const target = await renderCodeBlock("mermaid", SOURCE);
  const diagram = await screen.findByTestId("diagram");
  await act(async () => {
    fireEvent.mouseDown(diagram, { button: 0 });
  });
  await waitFor(() => expect(target.isFocused).toBe(true));

  mermaid.render.mockResolvedValue({
    svg: '<svg data-testid="edited-diagram"></svg>',
  });
  await act(async () => {
    target.commands.insertContent("\n  B --> C");
    target.commands.blur();
  });

  expect(await screen.findByTestId("edited-diagram")).toBeDefined();
  expect(mermaid.render).toHaveBeenLastCalledWith(
    expect.any(String),
    `${SOURCE}\n  B --> C`,
    expect.any(HTMLElement),
  );
});

it("colours the diagram for the editor's dark mode", async () => {
  scheme.colourScheme = "dark";
  await renderCodeBlock("mermaid", SOURCE);

  await screen.findByTestId("diagram");
  expect(mermaid.initialize).toHaveBeenLastCalledWith(
    expect.objectContaining({
      themeVariables: expect.objectContaining({ darkMode: true }),
    }),
  );
});

it("shows the diagram when inspecting a Post Revision, without opening the source", async () => {
  const target = await renderCodeBlock("mermaid", SOURCE, { editable: false });
  const diagram = await screen.findByTestId("diagram");

  await act(async () => {
    fireEvent.mouseDown(diagram, { button: 0 });
  });

  expect(target.isFocused).toBe(false);
  expect(screen.getByTestId("diagram")).toBe(diagram);
  expect(sourceIsVisible()).toBe(false);
});

it("leaves an empty Mermaid block as source for the Admin to fill in", async () => {
  await renderCodeBlock("mermaid", "");

  expect(sourceIsVisible()).toBe(true);
  await act(() => vi.dynamicImportSettled());
  expect(mermaid.render).not.toHaveBeenCalled();
});

it("does not draw diagrams for other languages", async () => {
  await renderCodeBlock("typescript", "const a = 1");

  await act(() => vi.dynamicImportSettled());
  expect(mermaid.render).not.toHaveBeenCalled();
});
