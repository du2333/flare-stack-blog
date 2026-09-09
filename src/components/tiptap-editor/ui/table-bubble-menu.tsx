import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Columns,
  Rows,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import type React from "react";
import { useLayoutEffect, useState } from "react";
import { MOTION, useMotionPresence } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

interface TableBubbleMenuProps {
  editor: Editor | null;
}

interface MenuButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isDestructive?: boolean;
  disabled?: boolean;
  size: "sm" | "md";
}

const MenuButton: React.FC<MenuButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  isActive,
  isDestructive,
  disabled,
  size,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex items-center justify-center rounded-lg transition-colors duration-200",
      size === "md" ? "h-10 w-10" : "h-8 w-8",
      disabled && "cursor-not-allowed opacity-30",
      !disabled &&
        !isActive &&
        !isDestructive &&
        "fuwari-text-50 hover:bg-(--fuwari-btn-regular-bg) hover:text-(--fuwari-primary)",
      isActive && "bg-(--fuwari-btn-regular-bg) text-(--fuwari-primary)",
      isDestructive &&
        "fuwari-text-50 hover:bg-(--fuwari-danger-bg) hover:text-(--fuwari-danger-fg)",
    )}
    title={label}
    type="button"
  >
    <Icon size={size === "md" ? 16 : 14} strokeWidth={isActive ? 2.5 : 2} />
  </button>
);

const Separator = () => (
  <div className="mx-1 h-4 w-px bg-(--fuwari-meta-divider)" />
);

function TableControls({
  editor,
  size,
}: {
  editor: Editor;
  size: "sm" | "md";
}) {
  return (
    <>
      <div className="flex items-center gap-0.5">
        <MenuButton
          size={size}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          icon={ArrowLeftToLine}
          label={m.editor_table_add_col_before()}
        />
        <MenuButton
          size={size}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          icon={ArrowRightToLine}
          label={m.editor_table_add_col_after()}
        />
        <MenuButton
          size={size}
          onClick={() => editor.chain().focus().deleteColumn().run()}
          icon={Columns}
          label={m.editor_table_delete_col()}
          isDestructive
        />
      </div>

      <Separator />

      <div className="flex items-center gap-0.5">
        <MenuButton
          size={size}
          onClick={() => editor.chain().focus().addRowBefore().run()}
          icon={ArrowUpToLine}
          label={m.editor_table_add_row_before()}
        />
        <MenuButton
          size={size}
          onClick={() => editor.chain().focus().addRowAfter().run()}
          icon={ArrowDownToLine}
          label={m.editor_table_add_row_after()}
        />
        <MenuButton
          size={size}
          onClick={() => editor.chain().focus().deleteRow().run()}
          icon={Rows}
          label={m.editor_table_delete_row()}
          isDestructive
        />
      </div>

      <Separator />

      <div className="flex items-center gap-0.5">
        <MenuButton
          size={size}
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          isActive={editor.isActive("tableHeader")}
          icon={TableIcon}
          label={m.editor_table_toggle_header_col()}
        />
        <MenuButton
          size={size}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          disabled={!editor.can().toggleHeaderRow()}
          icon={TableIcon}
          label={m.editor_table_toggle_header_row()}
        />
      </div>

      <Separator />

      <MenuButton
        size={size}
        onClick={() => editor.chain().focus().deleteTable().run()}
        icon={Trash2}
        label={m.editor_table_delete_table()}
        isDestructive
      />
    </>
  );
}

function selectionInTable(editor: Editor): boolean {
  if (editor.state.selection instanceof CellSelection) return true;
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "table") return true;
  }
  return false;
}

function cellRect(editor: Editor): DOMRect | null {
  const { selection } = editor.state;
  let cellPos: number | null = null;

  if (selection instanceof CellSelection) {
    cellPos = selection.$anchorCell.pos;
  } else {
    const { $from } = selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const type = $from.node(depth).type.name;
      if (type === "tableCell" || type === "tableHeader") {
        cellPos = $from.before(depth);
        break;
      }
    }
  }

  if (cellPos == null) return null;
  const dom = editor.view.nodeDOM(cellPos);
  if (!(dom instanceof Element)) return null;
  return dom.getBoundingClientRect();
}

function useTableSelection(editor: Editor | null) {
  return (
    useEditorState({
      editor,
      selector: (ctx) => {
        if (!ctx.editor?.isEditable) {
          return { active: false, from: 0, to: 0 };
        }
        return {
          active: selectionInTable(ctx.editor),
          from: ctx.editor.state.selection.from,
          to: ctx.editor.state.selection.to,
        };
      },
    }) ?? { active: false, from: 0, to: 0 }
  );
}

export const TableBubbleMenu: React.FC<TableBubbleMenuProps> = ({ editor }) => {
  const { active, from, to } = useTableSelection(editor);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!editor) {
      setCoords(null);
      return;
    }
    if (!active) return;

    const place = () => {
      const rect = cellRect(editor);
      if (!rect) {
        setCoords(null);
        return;
      }
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    };

    place();
    const scroller = document.getElementById("post-editor-scroll-container");
    scroller?.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      scroller?.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [editor, active, from, to]);

  const present = useMotionPresence(active && !!coords, MOTION.popover);
  if (!editor || !present || !coords) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 hidden lg:block"
      style={{
        top: coords.top,
        left: coords.left,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
    >
      <div
        data-state={active ? "open" : "closing"}
        inert={!active}
        className="fuwari-popover-motion pointer-events-auto flex items-center gap-0.5 rounded-xl bg-(--fuwari-card-bg) p-1 shadow-md ring-1 ring-(--fuwari-input-border)"
      >
        <TableControls editor={editor} size="sm" />
      </div>
    </div>
  );
};

export function TableMobileBar({ editor }: { editor: Editor | null }) {
  const { active } = useTableSelection(editor);

  const present = useMotionPresence(active, MOTION.modal);
  if (!editor || !present) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 lg:hidden">
      <div
        data-state={active ? "open" : "closing"}
        inert={!active}
        className="fuwari-edge-motion pointer-events-auto flex items-center justify-center gap-0.5 overflow-x-auto rounded-xl bg-(--fuwari-card-bg) p-1 shadow-md ring-1 ring-(--fuwari-input-border)"
      >
        <TableControls editor={editor} size="md" />
      </div>
    </div>
  );
}
