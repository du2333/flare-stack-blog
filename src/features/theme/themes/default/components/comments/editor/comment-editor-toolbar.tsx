import { useEditorState } from "@tiptap/react";
import clsx from "clsx";
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
import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import type React from "react";

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
  variant?: "default" | "ghost";
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive,
  icon: Icon,
  label,
}) => (
  <button
    onClick={onClick}
    className={clsx(
      "p-1.5 rounded-sm transition-all duration-200 flex items-center justify-center gap-2 group relative",
      isActive
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    )}
    title={label}
    type="button"
  >
    <Icon size={14} />
  </button>
);

const CommentEditorToolbar: React.FC<CommentEditorToolbarProps> = ({
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
    <div className="flex items-center gap-1 p-1 border border-border/20 rounded-sm bg-background/50 backdrop-blur-sm">
      {/* Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={isBold}
        icon={Bold}
        label="Bold"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={isItalic}
        icon={Italic}
        label="Italic"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={isUnderline}
        icon={UnderlineIcon}
        label="Underline"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={isStrike}
        icon={Strikethrough}
        label="Strike"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={isCode}
        icon={Code}
        label="Code"
      />

      <div className="h-4 w-px bg-border/20 mx-1"></div>

      {/* Inserts */}
      <ToolbarButton
        onClick={onLinkClick}
        isActive={isLink}
        icon={LinkIcon}
        label="Link"
      />
      <ToolbarButton
        onClick={onImageClick}
        isActive={false}
        icon={ImageIcon}
        label="Image"
      />

      <div className="ml-auto flex gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          icon={Undo}
          label="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          icon={Redo}
          label="Redo"
        />
      </div>
    </div>
  );
};

export default CommentEditorToolbar;
