import { EditorContent, useEditor } from "@tiptap/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import InsertModal from "./ui/insert-modal";
import EditorToolbar from "./ui/editor-toolbar";
import { TableBubbleMenu } from "./ui/table-bubble-menu";
import { FormulaModal } from "./ui/formula-modal";
import {
  addFormulaModalOpener,
  removeFormulaModalOpener,
  setActiveFormulaModalOpenerKey,
} from "./formula-modal-store";
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

export const Editor = memo(function Editor({
  content,
  onChange,
  onCreated,
  extensions,
}: EditorProps) {
  const formulaOpenerKeyRef = useRef(Symbol("formula-modal-opener"));
  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [modalInitialUrl, setModalInitialUrl] = useState("");
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);
  const [formulaPayload, setFormulaPayload] = useState<{
    mode: FormulaMode;
    initialLatex: string;
    editContext: { pos: number; type: FormulaMode } | null;
  }>({ mode: "inline", initialLatex: "", editContext: null });

  const editor = useEditor({
    extensions,
    content,
    onCreate: ({ editor: currentEditor }) => {
      onCreated?.(currentEditor);
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getJSON());
    },
    editorProps: {
      attributes: {
        class:
          "max-w-none focus:outline-none text-lg leading-relaxed min-h-[500px]",
      },
    },
    immediatelyRender: false,
  });

  const openLinkModal = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    setModalInitialUrl(previousUrl || "");
    setModalOpen("LINK");
  }, [editor]);

  const openImageModal = useCallback(() => {
    setModalInitialUrl("");
    setModalOpen("IMAGE");
  }, []);

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
        onLinkClick={openLinkModal}
        onImageClick={openImageModal}
        onFormulaInlineClick={() => openFormulaModal("inline")}
        onFormulaBlockClick={() => openFormulaModal("block")}
      />

      <TableBubbleMenu editor={editor} />

      <div
        className="relative min-h-125"
        onMouseDownCapture={markActiveFormulaOpener}
        onFocusCapture={markActiveFormulaOpener}
      >
        <EditorContent editor={editor} />
      </div>

      <InsertModal
        type={modalOpen}
        initialUrl={modalInitialUrl}
        onClose={() => setModalOpen(null)}
        onSubmit={handleModalSubmit}
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
