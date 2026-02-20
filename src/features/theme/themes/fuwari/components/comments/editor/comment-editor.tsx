import { useCallback, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import FuwariCommentEditorToolbar from "./comment-editor-toolbar";
import { FuwariInsertModal } from "./comment-insert-modal";
import type { JSONContent } from "@tiptap/react";
import type { ModalType } from "./comment-insert-modal";
import { commentExtensions } from "@/features/comments/components/editor/config";
import { normalizeLinkHref } from "@/lib/links/normalize-link-href";

interface CommentEditorProps {
  onSubmit: (content: JSONContent) => Promise<void>;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
  submitLabel?: string;
}

export const FuwariCommentEditor = ({
  onSubmit,
  isSubmitting,
  autoFocus,
  onCancel,
  submitLabel = "发表评论",
}: CommentEditorProps) => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalInitialUrl, setModalInitialUrl] = useState("");

  const editor = useEditor({
    extensions: commentExtensions,
    content: "",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class:
          "min-h-[80px] w-full bg-transparent py-2 text-sm focus:outline-none fuwari-text-75 max-w-none",
      },
    },
  });

  const { isEmpty } = useEditorState({
    editor,
    selector: (ctx) => ({
      isEmpty: ctx.editor.isEmpty,
    }),
  });

  const openLinkModal = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    setModalInitialUrl(previousUrl || "");
    setModalType("LINK");
  }, [editor]);

  const openImageModal = useCallback(() => {
    setModalInitialUrl("");
    setModalType("IMAGE");
  }, []);

  const handleSubmit = async () => {
    if (isEmpty || isSubmitting) return;

    try {
      await onSubmit(editor.getJSON());
      editor.commands.clearContent();
    } catch (error) {
      // Error handled by parent hook
    }
  };

  return (
    <div className="relative rounded-(--fuwari-radius-large) border border-(--fuwari-input-border) bg-transparent transition-all duration-300 overflow-hidden focus-within:bg-(--fuwari-primary)/5 focus-within:border-(--fuwari-primary)/50 focus-within:shadow-sm">
      {/* Toolbar */}
      <div className="border-b border-black/5 dark:border-white/5 px-1 py-0.5">
        <FuwariCommentEditorToolbar
          editor={editor}
          onLinkClick={openLinkModal}
          onImageClick={openImageModal}
        />
      </div>

      <EditorContent editor={editor} className="min-h-25 w-full px-4 py-3" />

      <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-black/5 dark:border-white/5">
        <span className="fuwari-text-30 text-xs">支持 Markdown</span>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="fuwari-text-50 text-sm hover:fuwari-text-75 transition-colors"
            >
              取消
            </button>
          )}
          <button
            disabled={isEmpty || isSubmitting}
            onClick={handleSubmit}
            className="fuwari-btn-primary h-8 px-4 text-sm rounded-lg gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{submitLabel}</span>
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </div>

      <FuwariInsertModal
        type={modalType}
        initialUrl={modalInitialUrl}
        onClose={() => setModalType(null)}
        onSubmit={(url, attrs) => {
          if (modalType === "LINK") {
            const href = normalizeLinkHref(url);
            if (href === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            } else {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href })
                .run();
            }
          } else if (modalType === "IMAGE") {
            editor
              .chain()
              .focus()
              .setImage({ src: url, ...attrs })
              .run();
          }
          setModalType(null);
        }}
      />
    </div>
  );
};
