import { EditorContent, useEditor } from "@tiptap/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import InsertModal from "./ui/insert-modal";
import GuitarProModal from "./ui/guitar-pro-modal";
import EditorToolbar from "./ui/editor-toolbar";
import { TableBubbleMenu } from "./ui/table-bubble-menu";
import { FormulaModal } from "./ui/formula-modal";
import { MarkdownSourceEditor } from "./ui/markdown-source-editor";
import {
  addFormulaModalOpener,
  removeFormulaModalOpener,
  setActiveFormulaModalOpenerKey,
} from "./formula-modal-store";
import {
  jsonToMarkdown,
  markdownToHtml,
} from "./utils/markdown-converter";
import type { EditorMode } from "./utils/markdown-converter";
import type { FormulaModalPayload } from "./formula-modal-store";
import type {
  Extensions,
  JSONContent,
  Editor as TiptapEditor,
} from "@tiptap/react";
import type { ModalType } from "./ui/insert-modal";
import type { FormulaMode } from "./ui/formula-modal";
import { normalizeLinkHref } from "@/lib/links/normalize-link-href";

interface EditorProps {
  content?: JSONContent | string;
  onChange?: (json: JSONContent) => void;
  onCreated?: (editor: TiptapEditor) => void;
  extensions: Extensions;
}

export { type EditorMode } from "./utils/markdown-converter";

export const Editor = memo(function Editor({
  content,
  onChange,
  onCreated,
  extensions,
}: EditorProps) {
  const formulaOpenerKeyRef = useRef(Symbol("formula-modal-opener"));
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [modalInitialUrl, setModalInitialUrl] = useState("");
  const [gpModalOpen, setGpModalOpen] = useState(false);
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaPayload, setFormulaPayload] = useState<{
    mode: FormulaMode;
    initialLatex: string;
    editContext: { pos: number; type: FormulaMode } | null;
  }>({ mode: "inline", initialLatex: "", editContext: null });

  // Dual-mode editing state
  const [editorMode, setEditorMode] = useState<EditorMode>("wysiwyg");
  const [markdownContent, setMarkdownContent] = useState("");
  const isSwitchingRef = useRef(false);
  const markdownSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const editor = useEditor({
    extensions,
    content,
    onCreate: ({ editor: currentEditor }) => {
      onCreated?.(currentEditor);
    },
    onUpdate: ({ editor: currentEditor }) => {
      // Only emit changes in WYSIWYG mode (markdown mode syncs separately)
      if (!isSwitchingRef.current) {
        onChange?.(currentEditor.getJSON());
      }
    },
    editorProps: {
      attributes: {
        class:
          "max-w-none focus:outline-none text-lg leading-relaxed min-h-[500px]",
      },
    },
    immediatelyRender: false,
  });

  // --- Mode switching ---
  const handleModeSwitch = useCallback(
    async (targetMode: EditorMode) => {
      if (!editor || targetMode === editorMode) return;
      isSwitchingRef.current = true;

      try {
        if (targetMode === "markdown") {
          // WYSIWYG → Markdown: serialize JSONContent to markdown
          const json = editor.getJSON();
          const md = jsonToMarkdown(json);
          setMarkdownContent(md);
        } else {
          // Markdown → WYSIWYG: parse markdown to HTML and load into editor
          const html = await markdownToHtml(markdownContent);
          editor.commands.setContent(html, { emitUpdate: false });
          // Emit the converted content after setting
          onChange?.(editor.getJSON());
        }
        setEditorMode(targetMode);
      } finally {
        isSwitchingRef.current = false;
      }
    },
    [editor, editorMode, markdownContent, onChange],
  );

  // Debounced markdown → JSON sync for auto-save support
  const handleMarkdownChange = useCallback(
    (md: string) => {
      setMarkdownContent(md);

      // Clear previous timer
      if (markdownSyncTimerRef.current) {
        clearTimeout(markdownSyncTimerRef.current);
      }

      // Debounce: convert markdown → Tiptap JSON and notify parent after 1s
      markdownSyncTimerRef.current = setTimeout(async () => {
        if (!editor) return;
        try {
          isSwitchingRef.current = true;
          const html = await markdownToHtml(md);
          editor.commands.setContent(html, { emitUpdate: false });
          onChange?.(editor.getJSON());
        } finally {
          isSwitchingRef.current = false;
        }
      }, 1000);
    },
    [editor, onChange],
  );

  // Cleanup sync timer on unmount
  useEffect(() => {
    return () => {
      if (markdownSyncTimerRef.current) {
        clearTimeout(markdownSyncTimerRef.current);
      }
    };
  }, []);

  const openLinkModal = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    setModalInitialUrl(previousUrl || "");
    setModalOpen("LINK");
  }, [editor]);

  const openImageModal = useCallback(() => {
    setModalInitialUrl("");
    setModalOpen("IMAGE");
  }, []);

  const openGuitarProModal = useCallback(() => {
    setGpModalOpen(true);
  }, []);

  const handleGuitarProSubmit = useCallback(
    (src: string, fileName: string) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({ type: "guitarPro", attrs: { src, fileName } })
        .run();
      setGpModalOpen(false);
    },
    [editor],
  );

  const openFormulaModal = useCallback((mode: FormulaMode) => {
    setFormulaPayload({
      mode,
      initialLatex: mode === "inline" ? "x^2+y^2=z^2" : "E = mc^2",
      editContext: null,
    });
    setFormulaModalOpen(true);
  }, []);

  useEffect(() => {
    const opener = (payload: FormulaModalPayload) => {
      setFormulaPayload({
        mode: payload.type,
        initialLatex: payload.latex,
        editContext: { pos: payload.pos, type: payload.type },
      });
      setFormulaModalOpen(true);
    };
    addFormulaModalOpener(formulaOpenerKeyRef.current, opener);
    return () => removeFormulaModalOpener(formulaOpenerKeyRef.current);
  }, []);

  const markActiveFormulaOpener = useCallback(() => {
    setActiveFormulaModalOpenerKey(formulaOpenerKeyRef.current);
  }, []);

  const handleFormulaApply = useCallback(
    (
      latex: string,
      mode: FormulaMode,
      editContext: { pos: number; type: FormulaMode } | null,
    ) => {
      if (!editor) return;
      if (editContext && editContext.type !== mode) {
        const chain = editor
          .chain()
          .setNodeSelection(editContext.pos)
          .deleteSelection();
        if (mode === "inline") {
          chain.insertInlineMath({ latex }).focus().run();
        } else {
          chain.insertBlockMath({ latex }).focus().run();
        }
      } else if (editContext) {
        if (editContext.type === "inline") {
          editor
            .chain()
            .setNodeSelection(editContext.pos)
            .updateInlineMath({ latex })
            .focus()
            .run();
        } else {
          editor
            .chain()
            .setNodeSelection(editContext.pos)
            .updateBlockMath({ latex })
            .focus()
            .run();
        }
      } else {
        if (mode === "inline") {
          editor.chain().focus().insertInlineMath({ latex }).run();
        } else {
          editor.chain().focus().insertBlockMath({ latex }).run();
        }
      }
      setFormulaModalOpen(false);
    },
    [editor],
  );

  const handleModalSubmit = (
    url: string,
    attrs?: { width?: number; height?: number },
  ) => {
    if (modalOpen === "LINK") {
      if (url === "") {
        editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      } else {
        const href = normalizeLinkHref(url);
        editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
      }
    } else if (modalOpen === "IMAGE") {
      if (url) {
        editor
          ?.chain()
          .focus()
          .setImage({ src: url, ...attrs })
          .run();
      }
    }

    setModalOpen(null);
  };

  return (
    <div className="flex flex-col relative group">
      <EditorToolbar
        editor={editor}
        editorMode={editorMode}
        onModeSwitch={handleModeSwitch}
        onLinkClick={openLinkModal}
        onImageClick={openImageModal}
        onGuitarProClick={openGuitarProModal}
        onFormulaInlineClick={() => openFormulaModal("inline")}
        onFormulaBlockClick={() => openFormulaModal("block")}
      />

      {editorMode === "wysiwyg" ? (
        <>
          <TableBubbleMenu editor={editor} />

          <div
            className="relative min-h-125"
            onMouseDownCapture={markActiveFormulaOpener}
            onFocusCapture={markActiveFormulaOpener}
          >
            <EditorContent editor={editor} />
          </div>
        </>
      ) : (
        <div className="relative min-h-125">
          <MarkdownSourceEditor
            value={markdownContent}
            onChange={handleMarkdownChange}
          />
        </div>
      )}

      <InsertModal
        type={modalOpen}
        initialUrl={modalInitialUrl}
        onClose={() => setModalOpen(null)}
        onSubmit={handleModalSubmit}
      />

      <GuitarProModal
        isOpen={gpModalOpen}
        onClose={() => setGpModalOpen(false)}
        onSubmit={handleGuitarProSubmit}
      />

      <FormulaModal
        isOpen={formulaModalOpen}
        mode={formulaPayload.mode}
        initialLatex={formulaPayload.initialLatex}
        editContext={formulaPayload.editContext}
        onClose={() => setFormulaModalOpen(false)}
        onApply={handleFormulaApply}
      />
    </div>
  );
});
