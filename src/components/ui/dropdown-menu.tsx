import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Menu, MenuItem } from "./menu";
import "./field.css";

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownMenuProps {
  value: string;
  options: Array<DropdownOption>;
  onChange: (value: string) => void;
  /** Names the trigger and the menu. */
  ariaLabel: string;
  /** Trigger content in place of the chosen option's label. */
  trigger?: ReactNode;
  /** Replaces the default field look of the trigger. */
  triggerClassName?: string;
  /** Where the menu opens; filters at a row's start open from their left edge. */
  placement?: ComponentProps<typeof Menu>["placement"];
  /** The menu is as wide as the trigger, for a field that fills its row. */
  matchTriggerWidth?: boolean;
}

/** A trigger showing the chosen option, opening a menu to pick another. */
export default function DropdownMenu({
  value,
  options,
  onChange,
  ariaLabel,
  trigger,
  triggerClassName = "group fuwari-input inline-flex w-auto items-center gap-2 text-left",
  placement,
  matchTriggerWidth,
}: DropdownMenuProps) {
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  return (
    <Menu
      label={ariaLabel}
      trigger={
        trigger ?? (
          <>
            <span className="truncate">{selected?.label}</span>
            <ChevronDown
              size={14}
              aria-hidden
              className="shrink-0 fuwari-text-50 transition-transform duration-200 group-aria-expanded:rotate-180"
            />
          </>
        )
      }
      triggerClassName={triggerClassName}
      placement={placement}
      matchTriggerWidth={matchTriggerWidth}
    >
      {options.map((option) => (
        <MenuItem
          key={option.value}
          role="menuitemradio"
          checked={option.value === value}
          onSelect={() => onChange(option.value)}
        >
          {option.label}
        </MenuItem>
      ))}
    </Menu>
  );
}
