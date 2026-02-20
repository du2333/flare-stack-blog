import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { useCallback, useState } from "react";
import { Loader2, Send } from "lucide-react";
import CommentEditorToolbar from "../editor/comment-editor-toolbar";
import InsertModal from "../editor/comment-insert-modal";
import type { JSONContent } from "@tiptap/react";
import type { ModalType } from "../editor/comment-insert-modal";
import { commentExtensions } from "@/features/comments/components/editor/config";
import { Button } from "@/components/ui/button";
import { normalizeLinkHref } from "@/lib/links/normalize-link-href";

interface CommentEditorProps {
  onSubmit: (content: JSONContent) => Promise<void>;
  isSubmitting?: boolean;
  autoFocus?: boolean;
  onCancel?: () => void;
  submitLabel?: string;
}

export const CommentEditor = ({
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
          "min-h-[80px] w-full bg-transparent py-2 text-sm focus:outline-none placeholder:text-muted-foreground/30 max-w-none",
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
    <div className="relative group/editor border border-border/10 rounded-sm bg-muted/5 transition-colors duration-300 hover:border-border/30 focus-within:border-border/50 focus-within:bg-background overflow-hidden">
      {/* Toolbar - Always visible at top */}
      <div className="border-b border-border/10 p-1 bg-background/50 backdrop-blur-sm sticky top-0 z-10 w-full">
        <CommentEditorToolbar
          editor={editor}
          onLinkClick={openLinkModal}
          onImageClick={openImageModal}
        />
      </div>

      <EditorContent editor={editor} className="min-h-25 w-full px-4 py-3" />

      <div className="flex items-center justify-between px-4 pb-2 pt-2 border-t border-border/10">
        <div className="text-[10px] font-mono text-muted-foreground/30 tracking-widest pl-2">
          支持 Markdown
        </div>
        <div className="flex items-center gap-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              取消
            </button>
          )}
          <Button
            size="sm"
            disabled={isEmpty || isSubmitting}
            onClick={handleSubmit}
            variant="ghost"
            className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest hover:bg-transparent hover:text-foreground p-0 flex items-center gap-2 group/btn"
          >
            <span>{submitLabel}</span>
            {isSubmitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send
                size={12}
                className="group-hover/btn:translate-x-0.5 transition-transform"
              />
            )}
          </Button>
        </div>
      </div>

      <InsertModal
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
