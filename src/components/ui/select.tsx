import { ChevronDown } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { FloatingPopover } from "./floating-popover";
import { nextListIndex } from "./list-keys";
import "./field.css";

const MENU_MAX_HEIGHT = 256;

const OPTIONS = '[role="option"]:not(:disabled)';

function enabledOptions(list: HTMLElement | null) {
  return Array.from(list?.querySelectorAll<HTMLElement>(OPTIONS) ?? []);
}

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

/**
 * A field showing the chosen option, opening a list to pick another. A
 * click, ArrowDown or ArrowUp opens it with focus on the chosen option, else
 * the first; arrows, Home, End and typeahead move focus between the options
 * and Enter or Space picks the focused one. Escape closes it back onto the
 * trigger, and Tab closes it and moves on from the trigger.
 */
export function Select({
  value,
  options,
  onChange,
  disabled = false,
  className,
  placeholder,
  id,
  "aria-label": ariaLabel,
}: {
  id?: string;
  /** Names the control when no label points at its `id`. */
  "aria-label"?: string;
  value: string;
  options: Array<SelectOption>;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  if (open && disabled) setOpen(false);
  const isOpen = open && !disabled;
  const [triggerEl, setTriggerEl] = useState<HTMLButtonElement | null>(null);
  const ownId = useId();
  const triggerId = id ?? ownId;
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  const close = () => {
    setOpen(false);
    triggerEl?.focus({ preventScroll: true });
  };

  const initialFocus = () => {
    const items = enabledOptions(document.getElementById(listId));
    return (
      items.find((item) => item.getAttribute("aria-selected") === "true") ??
      items[0] ??
      null
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      // The browser then moves on from the trigger's place in the page.
      close();
      return;
    }
    const items = enabledOptions(event.currentTarget);
    const next = nextListIndex(
      event,
      items,
      items.indexOf(document.activeElement as HTMLElement),
    );
    if (next < 0) return;
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={setTriggerEl}
        id={triggerId}
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          setOpen(true);
        }}
        className="fuwari-input flex items-center justify-between gap-2 text-left"
      >
        <span className={cn("min-w-0 truncate", !selected && "fuwari-text-30")}>
          {selected?.label ?? placeholder ?? ""}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 fuwari-text-50 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <FloatingPopover
        open={isOpen}
        anchor={triggerEl}
        onDismiss={() => setOpen(false)}
        returnFocusOnEscape
        initialFocus={initialFocus}
        matchTriggerWidth
        maxHeight={MENU_MAX_HEIGHT}
        id={listId}
        role="listbox"
        // The trigger carries the field's name: its own, or its label's.
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : triggerId}
        className="overflow-y-auto p-1 custom-scrollbar"
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next && !event.currentTarget.contains(next) && next !== triggerEl)
            setOpen(false);
        }}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
              disabled={option.disabled}
              onClick={() => {
                // Close first, so a dialog the change opens returns focus
                // to the trigger.
                close();
                onChange(option.value);
              }}
              className={cn(
                "flex w-full rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors disabled:pointer-events-none disabled:opacity-40",
                isSelected
                  ? "bg-(--theme-tonal-bg) text-(--theme-accent)"
                  : "fuwari-text-75 hover:bg-(--theme-tonal-bg)/70 hover:text-(--fuwari-fg) focus-visible:bg-(--theme-tonal-bg)/70 focus-visible:text-(--fuwari-fg)",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </FloatingPopover>
    </div>
  );
}
