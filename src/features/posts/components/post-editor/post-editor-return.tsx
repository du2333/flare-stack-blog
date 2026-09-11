import { createContext, useContext, useState, type ReactNode } from "react";
import type { TaxonomyReturn } from "@/components/admin/taxonomy-state";

const EditorReturnContext = createContext<TaxonomyReturn | null>(null);
export function PostEditorReturnProvider({
  initialValue,
  children,
}: {
  initialValue: TaxonomyReturn | null;
  children: ReactNode;
}) {
  // Keep the entry context while moving between this Post's editor and history.
  const [value] = useState(initialValue);
  return (
    <EditorReturnContext.Provider value={value}>
      {children}
    </EditorReturnContext.Provider>
  );
}
export function usePostEditorReturn() {
  return useContext(EditorReturnContext);
}
