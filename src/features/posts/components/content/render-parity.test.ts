import type { JSONContent } from "@tiptap/react";
import { getSchema } from "@tiptap/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { schemaExtensions } from "@/features/posts/editor/schema";
import { renderReactWithProseMirror } from "./pm-renderer.test-utils";
import { PARITY_FIXTURE } from "./render-parity.fixture";
import { markRenderers, nodeRenderers, renderReact } from "./render";
import { renderReactWithMath } from "./render-math";
import { MathFormula } from "@/components/content/math-formula";

const katex = {
  inline: (latex: string) =>
    createElement(MathFormula, { latex, mode: "inline" }),
  block: (latex: string) =>
    createElement(MathFormula, { latex, mode: "block" }),
};

function both(content: JSONContent, math?: typeof katex) {
  return {
    json: renderToStaticMarkup(renderReact(content, math)),
    prosemirror: renderToStaticMarkup(
      renderReactWithProseMirror(content, math),
    ),
  };
}

describe("renderReact matches the ProseMirror static renderer", () => {
  it("renders the fixture to the same HTML", () => {
    const { json, prosemirror } = both(PARITY_FIXTURE);
    expect(json).toBe(prosemirror);
    // The fixture reaches what it is meant to cover.
    expect(json).toContain("<thead>");
    expect(json).toMatch(/rowspan="2"/i);
    expect(json).toContain("<colgroup>");
    expect(json).toContain('start="3"');
    expect(json).toContain('data-type="block-math"');
    expect(json).toContain("A Bilibili video");
    expect(json).toContain("A YouTube video");
    expect(json).toContain("video.example.com");
  });

  it("renders the fixture with KaTeX to the same HTML", () => {
    const { json, prosemirror } = both(PARITY_FIXTURE, katex);
    expect(json).toBe(prosemirror);
    expect(json).toContain("katex");
  });

  it("renders the public page's math path to the same HTML", () => {
    const html = renderToStaticMarkup(renderReactWithMath(PARITY_FIXTURE));
    expect(html).toBe(both(PARITY_FIXTURE, katex).prosemirror);
  });

  it("renders each top-level block alone to the same HTML", () => {
    for (const block of PARITY_FIXTURE.content ?? []) {
      const { json, prosemirror } = both({ type: "doc", content: [block] });
      expect(json, JSON.stringify(block)).toBe(prosemirror);
    }
  });
});

describe("renderReact covers the editor schema", () => {
  const schema = getSchema(schemaExtensions);

  it("has a renderer for every node type", () => {
    expect(Object.keys(nodeRenderers).sort()).toEqual(
      Object.keys(schema.nodes).sort(),
    );
  });

  it("has a renderer for every mark type, in the schema's mark order", () => {
    // Marks nest in this order, so it is part of the output. The schema's
    // marks are keyed in rank order, the order ProseMirror sorts them in.
    expect(Object.keys(markRenderers)).toEqual(Object.keys(schema.marks));
  });
});
