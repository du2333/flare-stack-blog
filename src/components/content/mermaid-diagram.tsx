import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ColourScheme } from "@/components/common/colour-scheme-provider";
import { cn } from "@/lib/utils";
import { StatusText } from "@/components/ui/status-text";
import { m } from "@/paraglide/messages";
import { renderMermaid } from "./mermaid-render";
import { mermaidThemeVariables } from "./mermaid-theme";

export interface MermaidDiagramProps {
  /** Mermaid source of the code block. */
  source: string;
  /** Current colour scheme; the diagram re-renders with its colours when it changes. */
  colourScheme: ColourScheme;
  /**
   * Shown until the diagram renders, and kept when rendering fails.
   * Defaults to the source as plain text.
   */
  fallback?: ReactNode;
  className?: string;
}

type DiagramState =
  | { status: "pending" }
  | { status: "rendered"; svg: string }
  | { status: "failed"; message: string };

/**
 * Renders a Mermaid code block as a diagram in the browser. The source shows
 * until Mermaid has loaded and rendered; on a syntax error the source stays
 * with the error below it. A diagram wider than its container scrolls
 * horizontally. Mermaid itself loads only when this mounts (ADR 0027).
 */
export function MermaidDiagram({
  source,
  colourScheme,
  fallback,
  className,
}: MermaidDiagramProps) {
  const [state, setState] = useState<DiagramState>({ status: "pending" });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current = true;
    const themeVariables = mermaidThemeVariables(
      containerRef.current,
      colourScheme,
    );
    renderMermaid(source, themeVariables).then(
      (svg) => {
        if (current) setState({ status: "rendered", svg });
      },
      (error: unknown) => {
        if (current) setState({ status: "failed", message: errorText(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [source, colourScheme]);

  const svg = state.status === "rendered" ? state.svg : null;
  useLayoutEffect(() => {
    if (svg !== null) showAtNaturalWidth(containerRef.current);
  }, [svg]);

  if (svg !== null) {
    return (
      <div
        ref={containerRef}
        className={cn("overflow-x-auto [&>svg]:mx-auto", className)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return (
    <div ref={containerRef} className={cn(className)}>
      {fallback ?? (
        <pre>
          <code>{source}</code>
        </pre>
      )}
      {state.status === "failed" && (
        <StatusText error className="mt-2 px-5 pb-4 whitespace-pre-wrap">
          {m.common_mermaid_render_failed()}
          {state.message && `: ${state.message}`}
        </StatusText>
      )}
    </div>
  );
}

/**
 * Mermaid sizes diagrams to `width: 100%` capped at their natural width, which
 * shrinks wide diagrams until the text is unreadable on phones. Pin the
 * natural width instead and let the container scroll.
 */
function showAtNaturalWidth(container: HTMLElement | null) {
  const svg = container?.querySelector("svg");
  if (!svg?.style.maxWidth) return;
  svg.style.width = svg.style.maxWidth;
  svg.style.maxWidth = "none";
  svg.style.display = "block";
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
