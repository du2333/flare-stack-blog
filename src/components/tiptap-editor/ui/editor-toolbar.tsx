import { useEditorState } from "@tiptap/react";
import clsx from "clsx";
import {
  Bold,
  Code,
  FileCode,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Monitor,
  Quote,
  Redo,
  Sigma,
  SquareFunction,
  Strikethrough,
  Table as TableIcon,
  Terminal,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";
import type { EditorMode } from "../utils/markdown-converter";
import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import type React from "react";

interface EditorToolbarProps {
  editor: Editor | null;
  editorMode: EditorMode;
  onModeSwitch: (mode: EditorMode) => void;
  onLinkClick: () => void;
  onImageClick: () => void;
  onFormulaInlineClick: () => void;
  onFormulaBlockClick: () => void;
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
      "h-8 w-8 flex items-center justify-center transition-colors duration-200 group relative rounded-none",
      isActive
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
    )}
    title={label}
    type="button"
  >
    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
  </button>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  editorMode,
  onModeSwitch,
  onLinkClick,
  onImageClick,
  onFormulaInlineClick,
  onFormulaBlockClick,
}) => {
  const {
    isBold,
    isHeading2,
    isHeading3,
    isItalic,
    isUnderline,
    isStrike,
    isCode,
    isCodeBlock,
    isInlineMath,
    isBlockMath,
    isBulletList,
    isOrderedList,
    isBlockquote,
    isLink,
  } = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          isBold: false,
          isHeading2: false,
          isHeading3: false,
          isItalic: false,
          isUnderline: false,
          isStrike: false,
          isCode: false,
          isBulletList: false,
          isOrderedList: false,
          isBlockquote: false,
          isLink: false,
          isInlineMath: false,
          isBlockMath: false,
        };
      }
      return {
        isBold: ctx.editor.isActive("bold"),
        isHeading2: ctx.editor.isActive("heading", { level: 2 }),
        isHeading3: ctx.editor.isActive("heading", { level: 3 }),
        isItalic: ctx.editor.isActive("italic"),
        isUnderline: ctx.editor.isActive("underline"),
        isStrike: ctx.editor.isActive("strike"),
        isCode: ctx.editor.isActive("code"),
        isCodeBlock: ctx.editor.isActive("codeBlock"),
        isInlineMath: ctx.editor.isActive("inlineMath"),
        isBlockMath: ctx.editor.isActive("blockMath"),
        isBulletList: ctx.editor.isActive("bulletList"),
        isOrderedList: ctx.editor.isActive("orderedList"),
        isBlockquote: ctx.editor.isActive("blockquote"),
        isLink: ctx.editor.isActive("link"),
      };
    },
  }) || {
    isBold: false,
    isHeading2: false,
    isHeading3: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    isCode: false,
    isCodeBlock: false,
    isInlineMath: false,
    isBlockMath: false,
    isBulletList: false,
    isOrderedList: false,
    isBlockquote: false,
    isLink: false,
  };

  return (
    <div className="sticky top-0 z-30 mb-8 py-2 bg-background border-b border-border/50 flex flex-wrap items-center gap-1 px-4">
      {/* Mode Toggle */}
      <div className="flex items-center border border-border/40 rounded-sm mr-2">
        <button
          onClick={() => onModeSwitch("wysiwyg")}
          className={clsx(
            "h-7 px-2 flex items-center gap-1.5 text-[11px] font-mono transition-colors",
            editorMode === "wysiwyg"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
          )}
          title="所见即所得模式"
          type="button"
        >
          <Monitor size={12} />
          <span className="hidden sm:inline">所见即所得</span>
        </button>
        <button
          onClick={() => onModeSwitch("markdown")}
          className={clsx(
            "h-7 px-2 flex items-center gap-1.5 text-[11px] font-mono transition-colors",
            editorMode === "markdown"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/20",
          )}
          title="Markdown 源码模式"
          type="button"
        >
          <FileCode size={12} />
          <span className="hidden sm:inline">Markdown</span>
        </button>
      </div>

      <div className="h-4 w-px bg-border/50 mx-1"></div>

      {editorMode === "wysiwyg" ? (
        <>
          {/* Headings */}
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            isActive={isHeading2}
            icon={Heading2}
            label="二级标题"
          />
          <ToolbarButton
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            isActive={isHeading3}
            icon={Heading3}
            label="三级标题"
          />

          <div className="h-4 w-px bg-border/50 mx-2"></div>

          {/* Formatting */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            isActive={isBold}
            icon={Bold}
            label="粗体"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            isActive={isItalic}
            icon={Italic}
            label="斜体"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            isActive={isUnderline}
            icon={UnderlineIcon}
            label="下划线"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            isActive={isStrike}
            icon={Strikethrough}
            label="删除线"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleCode().run()}
            isActive={isCode}
            icon={Code}
            label="行内代码"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            isActive={isCodeBlock}
            icon={Terminal}
            label="代码块"
          />
          <ToolbarButton
            onClick={onFormulaInlineClick}
            isActive={isInlineMath}
            icon={Sigma}
            label="行内公式"
          />
          <ToolbarButton
            onClick={onFormulaBlockClick}
            isActive={isBlockMath}
            icon={SquareFunction}
            label="块级公式"
          />

          <div className="h-4 w-px bg-border/50 mx-2"></div>

          {/* Lists & Blocks */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            isActive={isBulletList}
            icon={List}
            label="无序列表"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            isActive={isOrderedList}
            icon={ListOrdered}
            label="有序列表"
          />
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            isActive={isBlockquote}
            icon={Quote}
            label="引用"
          />
          <ToolbarButton
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            isActive={editor?.isActive("table")}
            icon={TableIcon}
            label="插入表格"
          />

          <div className="h-4 w-px bg-border/50 mx-2"></div>

          {/* Inserts */}
          <ToolbarButton
            onClick={onLinkClick}
            isActive={isLink}
            icon={LinkIcon}
            label="插入链接"
          />
          <ToolbarButton
            onClick={onImageClick}
            isActive={false}
            icon={ImageIcon}
            label="插入图片"
          />

          <div className="ml-auto flex gap-1">
            <ToolbarButton
              onClick={() => editor?.chain().focus().undo().run()}
              icon={Undo}
              label="撤销"
            />
            <ToolbarButton
              onClick={() => editor?.chain().focus().redo().run()}
              icon={Redo}
              label="重做"
            />
          </div>
        </>
      ) : (
        <span className="text-[11px] font-mono text-muted-foreground ml-2">
          Markdown 源码编辑 · 支持标准 Markdown 语法、$LaTeX$ 公式、代码块
        </span>
      )}
    </div>
  );
};

export default EditorToolbar;
