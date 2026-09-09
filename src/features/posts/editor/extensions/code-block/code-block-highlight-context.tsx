import { createContext, useMemo, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/react";
import { snapshotHtmlByKey } from "./highlight";

const emptySnapshotHtml = new Map<string, string>();

export const CodeBlockHighlightContext =
  createContext<Map<string, string>>(emptySnapshotHtml);

export function CodeBlockHighlightProvider({
  snapshotContent,
  children,
}: {
  snapshotContent: JSONContent | null | undefined;
  children: ReactNode;
}) {
  const snapshotHtml = useMemo(
    () => snapshotHtmlByKey(snapshotContent),
    [snapshotContent],
  );

  return (
    <CodeBlockHighlightContext.Provider value={snapshotHtml}>
      {children}
    </CodeBlockHighlightContext.Provider>
  );
}
