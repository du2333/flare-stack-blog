import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { getHighlighter, themes } from "@/lib/shiki";

const shikiPluginKey = new PluginKey("shiki");

// Helper to find all code blocks in document
function findCodeBlocks(doc: ProsemirrorNode, nodeTypeName: string) {
  const result: Array<{ pos: number; node: ProsemirrorNode }> = [];
  doc.descendants((node, pos) => {
    if (node.type.name === nodeTypeName) {
      result.push({ pos, node });
    }
    return true;
  });
  return result;
}

// Convert style object to CSS string
function styleToString(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

// Create decorations for all code blocks (synchronous version)
function createDecorationsSync(
  doc: ProsemirrorNode,
  nodeTypeName: string,
  highlighter: Awaited<ReturnType<typeof getHighlighter>>,
): DecorationSet {
  const decorations: Array<Decoration> = [];
  const codeBlocks = findCodeBlocks(doc, nodeTypeName);

  for (const { pos, node } of codeBlocks) {
    const language = node.attrs.language || "plaintext";
    const code = node.textContent;

    // Check if language is supported
    const loadedLangs = highlighter.getLoadedLanguages();
    const safeLang = loadedLangs.includes(language) ? language : "plaintext";

    try {
      const tokens = highlighter.codeToTokens(code, {
        lang: safeLang,
        themes: {
          light: themes.light,
          dark: themes.dark,
        },
      });

      // Add node decoration for background
      if (tokens.bg || tokens.fg) {
        const nodeStyle: Record<string, string> = {};
        if (tokens.fg) nodeStyle["color"] = tokens.fg;
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            style: styleToString(nodeStyle),
            class: "shiki",
          }),
        );
      }

      // Add inline decorations for each token
      let tokenPos = pos + 1; // +1 to enter the node
      for (const line of tokens.tokens) {
        for (const token of line) {
          const to = tokenPos + token.content.length;
          const style = styleToString(token.htmlStyle || {});
          if (style) {
            decorations.push(Decoration.inline(tokenPos, to, { style }));
          }
          tokenPos = to;
        }
        tokenPos += 1; // newline
      }
    } catch (e) {
      console.warn(`Shiki highlighting failed for ${language}:`, e);
    }
  }

  return DecorationSet.create(doc, decorations);
}

export interface ShikiPluginOptions {
  name: string;
}

export function createShikiPlugin({ name }: ShikiPluginOptions): Plugin {
  // Store highlighter once loaded
  let highlighterInstance: Awaited<ReturnType<typeof getHighlighter>> | null =
    null;

  return new Plugin({
    key: shikiPluginKey,
    view(view: EditorView) {
      // Initialize highlighter async, then trigger re-decoration
      const initHighlighter = async () => {
        highlighterInstance = await getHighlighter();
        // Force re-decoration by dispatching a transaction
        const tr = view.state.tr.setMeta("shikiReady", true);
        view.dispatch(tr);
      };
      initHighlighter();

      return {
        update(_updatedView: EditorView, prevState: EditorState) {
          // Re-apply decorations when document changes in a code block
          const sel = view.state.selection;
          const prevSel = prevState.selection;
          const inCodeBlock = sel.$head.parent.type.name === name;
          const wasInCodeBlock = prevSel.$head.parent.type.name === name;

          if (
            highlighterInstance &&
            view.state.doc !== prevState.doc &&
            (inCodeBlock || wasInCodeBlock)
          ) {
            // Trigger re-decoration
            const tr = view.state.tr.setMeta("shikiUpdate", true);
            view.dispatch(tr);
          }
        },
        destroy() {},
      };
    },
    state: {
      init(_config: unknown, _state: EditorState): DecorationSet {
        // Cannot create decorations until highlighter is loaded
        return DecorationSet.empty;
      },
      apply(
        tr: Transaction,
        decorations: DecorationSet,
        _oldState: EditorState,
        newState: EditorState,
      ): DecorationSet {
        // Check if highlighter is ready
        if (!highlighterInstance) {
          return DecorationSet.empty;
        }

        const shikiReady = tr.getMeta("shikiReady");
        const shikiUpdate = tr.getMeta("shikiUpdate");

        // Recreate decorations when:
        // 1. Highlighter just became ready
        // 2. Document changed (from view update callback)
        // 3. Code block was modified
        if (shikiReady || shikiUpdate || tr.docChanged) {
          return createDecorationsSync(newState.doc, name, highlighterInstance);
        }

        // Map existing decorations through document changes
        return decorations.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state: EditorState): DecorationSet | undefined {
        return shikiPluginKey.getState(state) as DecorationSet | undefined;
      },
    },
  });
}
