import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { ChevronDown } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button, buttonClass } from "@/components/ui/button";
import {
  FloatingPopover,
  virtualAnchor,
} from "@/components/ui/floating-popover";
import { IconButton } from "@/components/ui/icon-button";
import { MOTION, useMotionPresence } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  TABLE_CONTROL_GROUPS,
  type TableAction,
  type TableControlGroup,
  tableControlState,
} from "./table-controls";
import { tableMenuAnchor } from "./table-menu-position";

interface TableBubbleMenuProps {
  editor: Editor | null;
}

type Size = "sm" | "md";
type ControlState = ReturnType<typeof tableControlState>;

const TOOLBAR_CLASS =
  "pointer-events-auto flex items-center gap-0.5 rounded-xl bg-(--fuwari-card-bg) p-1 shadow-md ring-1 ring-(--fuwari-input-border)";

const Separator = () => (
  <div className="mx-1 h-4 w-px shrink-0 bg-(--fuwari-meta-divider)" />
);

/** A labelled dropdown of table actions, such as everything about rows. */
function TableActionMenu({
  editor,
  group,
  state,
  size,
}: {
  editor: Editor;
  group: Extract<TableControlGroup, { kind: "menu" }>;
  state: ControlState;
  size: Size;
}) {
  return (
    <ActionMenu
      label={group.label()}
      trigger={
        <>
          {group.label()}
          <ChevronDown
            size={12}
            className="transition-transform duration-200 group-aria-expanded:rotate-180"
          />
        </>
      }
      triggerClassName={cn(
        "group",
        buttonClass({ variant: "plain", size }),
        "aria-expanded:bg-(--fuwari-btn-regular-bg) aria-expanded:text-(--fuwari-fg)",
      )}
      items={group.actions
        .filter((action) => state[action.id]?.available)
        .map((action) => ({
          label: action.label(),
          icon: action.icon,
          danger: action.destructive,
          checked: state[action.id]?.active,
          onSelect: () => action.run(editor),
        }))}
    />
  );
}

function TableActionButton({
  editor,
  action,
  active,
  iconOnly,
  size,
}: {
  editor: Editor;
  action: TableAction;
  active?: boolean;
  iconOnly?: boolean;
  size: Size;
}) {
  const Icon = action.icon;
  if (iconOnly) {
    return (
      <IconButton
        label={action.label()}
        active={active}
        onClick={() => action.run(editor)}
        size={size === "md" ? "lg" : "sm"}
        tone={action.destructive ? "danger" : undefined}
      >
        <Icon size={size === "md" ? 16 : 14} strokeWidth={active ? 2.5 : 2} />
      </IconButton>
    );
  }
  return (
    <Button
      variant="plain"
      size={size}
      tone={action.destructive ? "danger" : undefined}
      aria-pressed={active}
      onClick={() => action.run(editor)}
      icon={<Icon size={14} aria-hidden />}
      className={cn(
        active && "bg-(--fuwari-btn-regular-bg) text-(--fuwari-fg)",
      )}
    >
      {action.label()}
    </Button>
  );
}

/** The table menu's groups, in `TABLE_CONTROL_GROUPS` order. */
function TableControls({ editor, size }: { editor: Editor; size: Size }) {
  const state =
    useEditorState({
      editor,
      selector: ({ editor: current }) => tableControlState(current),
    }) ?? tableControlState(editor);

  const groups = TABLE_CONTROL_GROUPS.filter((group) =>
    group.actions.some((action) => state[action.id]?.available),
  );

  return groups.map((group, index) => (
    <div key={group.id} className="flex shrink-0 items-center gap-0.5">
      {index > 0 && <Separator />}
      {group.kind === "menu" ? (
        <TableActionMenu
          editor={editor}
          group={group}
          state={state}
          size={size}
        />
      ) : (
        group.actions
          .filter((action) => state[action.id]?.available)
          .map((action) => (
            <TableActionButton
              key={action.id}
              editor={editor}
              action={action}
              active={state[action.id]?.active}
              // The phone bar has no room for every label.
              iconOnly={group.iconOnly || size === "md"}
              size={size}
            />
          ))
      )}
    </div>
  ));
}

function selectionInTable(editor: Editor): boolean {
  if (editor.state.selection instanceof CellSelection) return true;
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "table") return true;
  }
  return false;
}

function activeCell(editor: Editor): Element | null {
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
  return dom instanceof Element ? dom : null;
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
  // Dragging a column border moves the cell without moving the selection.
  const [docVersion, setDocVersion] = useState(0);
  useEffect(() => {
    if (!editor || !active) return;
    const bump = () => setDocVersion((version) => version + 1);
    editor.on("update", bump);
    return () => {
      editor.off("update", bump);
    };
  }, [editor, active]);

  const anchor = useMemo(() => {
    if (!editor || !active) return null;
    const table = activeCell(editor)?.closest("table");
    if (!table) return null;
    const scroller = document.getElementById("post-editor-scroll-container");
    return virtualAnchor(() => {
      const cell = activeCell(editor);
      if (!cell || !table.isConnected) return null;
      return tableMenuAnchor({
        table: table.getBoundingClientRect(),
        cell: cell.getBoundingClientRect(),
        visibleTop: scroller?.getBoundingClientRect().top ?? 0,
      });
    }, table);
  }, [editor, active, from, to, docVersion]);

  if (!editor) return null;

  return (
    <FloatingPopover
      open={anchor !== null}
      anchor={anchor}
      dismissible={false}
      placement="top-end"
      role="toolbar"
      aria-label={m.editor_table_menu()}
      className="hidden items-center gap-0.5 p-1 lg:flex"
    >
      <TableControls editor={editor} size="sm" />
    </FloatingPopover>
  );
};

export function TableMobileBar({ editor }: { editor: Editor | null }) {
  const { active } = useTableSelection(editor);

  const present = useMotionPresence(active, MOTION.modal);
  if (!editor || !present) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center lg:hidden">
      <div
        role="toolbar"
        aria-label={m.editor_table_menu()}
        data-state={active ? "open" : "closing"}
        inert={!active}
        className={cn(
          "fuwari-edge-motion max-w-full overflow-x-auto",
          TOOLBAR_CLASS,
        )}
      >
        <TableControls editor={editor} size="md" />
      </div>
    </div>
  );
}
