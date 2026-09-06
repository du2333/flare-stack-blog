import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
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
}

const MenuButton: React.FC<MenuButtonProps> = ({
  onClick,
  icon: Icon,
  label,
  isActive,
  isDestructive,
  disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200",
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
    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
  </button>
);

const Separator = () => (
  <div className="mx-1 h-4 w-px bg-(--fuwari-meta-divider)" />
);

export const TableBubbleMenu: React.FC<TableBubbleMenuProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubbleMenu"
      shouldShow={({ editor: currentEditor }: { editor: Editor }) =>
        currentEditor.isActive("table")
      }
      options={{
        placement: "top",
        offset: 8,
      }}
      className="flex items-center gap-0.5 rounded-xl bg-(--fuwari-card-bg) p-1 shadow-md ring-1 ring-(--fuwari-input-border)"
    >
      <div className="flex items-center gap-0.5">
        <MenuButton
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          icon={ArrowLeftToLine}
          label={m.editor_table_add_col_before()}
        />
        <MenuButton
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          icon={ArrowRightToLine}
          label={m.editor_table_add_col_after()}
        />
        <MenuButton
          onClick={() => editor.chain().focus().deleteColumn().run()}
          icon={Columns}
          label={m.editor_table_delete_col()}
          isDestructive
        />
      </div>

      <Separator />

      <div className="flex items-center gap-0.5">
        <MenuButton
          onClick={() => editor.chain().focus().addRowBefore().run()}
          icon={ArrowUpToLine}
          label={m.editor_table_add_row_before()}
        />
        <MenuButton
          onClick={() => editor.chain().focus().addRowAfter().run()}
          icon={ArrowDownToLine}
          label={m.editor_table_add_row_after()}
        />
        <MenuButton
          onClick={() => editor.chain().focus().deleteRow().run()}
          icon={Rows}
          label={m.editor_table_delete_row()}
          isDestructive
        />
      </div>

      <Separator />

      <div className="flex items-center gap-0.5">
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
          isActive={editor.isActive("tableHeader")}
          icon={TableIcon}
          label={m.editor_table_toggle_header_col()}
        />
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          disabled={!editor.can().toggleHeaderRow()}
          icon={TableIcon}
          label={m.editor_table_toggle_header_row()}
        />
      </div>

      <Separator />

      <MenuButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        icon={Trash2}
        label={m.editor_table_delete_table()}
        isDestructive
      />
    </BubbleMenu>
  );
};
