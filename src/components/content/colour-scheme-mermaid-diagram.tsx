import type { ReactNode } from "react";
import { useColourScheme } from "@/components/common/colour-scheme-provider";
import { MermaidDiagram } from "./mermaid-diagram";

/**
 * A Mermaid code block's diagram inside a code block card, coloured for the
 * current colour scheme. `fallback` (the block's source) shows until the diagram
 * renders and stays on a syntax error. Shared by published posts and the
 * editor's at-rest preview.
 */
export function ColourSchemeMermaidDiagram({
  source,
  fallback,
}: {
  source: string;
  fallback: ReactNode;
}) {
  const { colourScheme } = useColourScheme();
  return (
    <MermaidDiagram
      source={source}
      colourScheme={colourScheme}
      fallback={fallback}
      className="custom-scrollbar [&>svg]:my-4"
    />
  );
}
