import type { JSONContent } from "@tiptap/react";
import { MathFormula } from "@/components/content/math-formula";
import { renderReact } from "./render";

export function renderReactWithMath(content: JSONContent) {
  return renderReact(content, {
    inline: (latex) => <MathFormula latex={latex} mode="inline" />,
    block: (latex) => <MathFormula latex={latex} mode="block" />,
  });
}
