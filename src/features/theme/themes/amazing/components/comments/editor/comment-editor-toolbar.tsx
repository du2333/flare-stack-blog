import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface CommentEditorToolbarProps {
  editor: Editor;
  onLinkClick: () => void;
  onImageClick: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  icon: LucideIcon;
  label?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive,
  icon: Icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={cn(
      "p-1.5 rounded-md transition-all duration-200 flex items-center justify-center",
      isActive
        ? "bg-(--fuwari-primary) text-white dark:text-black/75"
        : "fuwari-text-50 hover:bg-black/5 dark:hover:bg-white/10 hover:fuwari-text-75",
    )}
    title={label}
    type="button"
  >
    <Icon size={14} />
  </button>
);

const FuwariCommentEditorToolbar: React.FC<CommentEditorToolbarProps> = ({
  editor,
  onLinkClick,
  onImageClick,
}) => {
  const { isBold, isItalic, isUnderline, isStrike, isCode, isLink } =
    useEditorState({
      editor,
      selector: (ctx) => ({
        isBold: ctx.editor.isActive("bold"),
        isItalic: ctx.editor.isActive("italic"),
        isUnderline: ctx.editor.isActive("underline"),
        isStrike: ctx.editor.isActive("strike"),
        isCode: ctx.editor.isActive("code"),
        isLink: ctx.editor.isActive("link"),
      }),
    });

  return (
    <div className="flex items-center gap-0.5 p-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={isBold}
        icon={Bold}
        label={m.comments_editor_toolbar_bold()}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={isItalic}
        icon={Italic}
        label={m.comments_editor_toolbar_italic()}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={isUnderline}
        icon={UnderlineIcon}
        label={m.comments_editor_toolbar_underline()}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={isStrike}
        icon={Strikethrough}
        label={m.comments_editor_toolbar_strike()}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={isCode}
        icon={Code}
        label={m.comments_editor_toolbar_code()}
      />

      <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-1" />

      <ToolbarButton
        onClick={onLinkClick}
        isActive={isLink}
        icon={LinkIcon}
        label={m.comments_editor_toolbar_link()}
      />
      <ToolbarButton
        onClick={onImageClick}
        isActive={false}
        icon={ImageIcon}
        label={m.comments_editor_toolbar_image()}
      />

      <div className="ml-auto flex gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          icon={Undo}
          label={m.comments_editor_toolbar_undo()}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          icon={Redo}
          label={m.comments_editor_toolbar_redo()}
        />
      </div>
    </div>
  );
};

export default FuwariCommentEditorToolbar;
