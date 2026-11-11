import type { Placement } from "@floating-ui/dom";
import { Check, Ellipsis, type LucideIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { iconButtonClass } from "./icon-button";
import { Menu, MenuItem, MenuSeparator } from "./menu";

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  /** Runs after the menu has closed and focus is back on `trigger`. */
  onSelect: (trigger: HTMLButtonElement) => void;
  danger?: boolean;
  disabled?: boolean;
  /** Set for a toggle: whether it is on. */
  checked?: boolean;
  /** Draw a rule above this item. */
  separator?: boolean;
}

interface ActionMenuProps {
  /** Names the trigger and the menu; also the icon trigger's tooltip. */
  label: string;
  items: Array<ActionMenuItem>;
  /** Trigger content in place of the "more" icon. */
  trigger?: ReactNode;
  /** Replaces the default square icon-button look. */
  triggerClassName?: string;
  disabled?: boolean;
  placement?: Placement;
}

/** A trigger that opens a menu of commands. */
export function ActionMenu({
  label,
  items,
  trigger,
  triggerClassName,
  disabled,
  placement,
}: ActionMenuProps) {
  if (items.length === 0) return null;
  return (
    <Menu
      label={label}
      trigger={trigger ?? <Ellipsis size={18} aria-hidden />}
      triggerClassName={
        triggerClassName ??
        iconButtonClass({
          className:
            "pointer-coarse:size-10 aria-expanded:bg-(--theme-tonal-bg) aria-expanded:text-(--theme-accent)",
        })
      }
      triggerTitle={trigger ? undefined : label}
      disabled={disabled}
      placement={placement}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Fragment key={item.label}>
            {item.separator && <MenuSeparator />}
            <MenuItem
              role={
                item.checked === undefined ? "menuitem" : "menuitemcheckbox"
              }
              checked={item.checked}
              danger={item.danger}
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              {Icon && <Icon size={15} aria-hidden className="shrink-0" />}
              <span className="flex-1">{item.label}</span>
              {item.checked && (
                <Check
                  size={14}
                  aria-hidden
                  className="shrink-0 text-(--theme-accent)"
                />
              )}
            </MenuItem>
          </Fragment>
        );
      })}
    </Menu>
  );
}
