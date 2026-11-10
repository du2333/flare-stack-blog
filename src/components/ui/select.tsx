import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FloatingPopover } from "./floating-popover";
import "./field.css";

const MENU_MAX_HEIGHT = 256;

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function Select({
  value,
  options,
  onChange,
  disabled = false,
  className,
  placeholder,
  id,
}: {
  id?: string;
  value: string;
  options: Array<SelectOption>;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0,
  );

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((current) => nextEnabledIndex(options, current, step));
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const option = options[activeIndex];
        if (!option || option.disabled) return;
        onChange(option.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, onChange, open, options]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="fuwari-input flex items-center justify-between gap-2 text-left"
      >
        <span className={cn("min-w-0 truncate", !selected && "fuwari-text-30")}>
          {selected?.label ?? placeholder ?? ""}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 fuwari-text-50 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <FloatingPopover
        open={open}
        anchor={open ? triggerRef.current : null}
        onDismiss={() => setOpen(false)}
        returnFocusOnEscape
        matchTriggerWidth
        maxHeight={MENU_MAX_HEIGHT}
        id={listId}
        role="listbox"
        className="overflow-y-auto p-1 custom-scrollbar"
      >
        {options.map((option, index) => {
          const active = index === activeIndex;
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={option.disabled}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={cn(
                "flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                option.disabled && "cursor-not-allowed opacity-40",
                isSelected
                  ? "bg-(--fuwari-btn-regular-bg) text-(--theme-accent)"
                  : active
                    ? "bg-(--fuwari-btn-regular-bg)/70 fuwari-text-90"
                    : "fuwari-text-75",
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

function nextEnabledIndex(
  options: Array<SelectOption>,
  current: number,
  step: number,
) {
  if (options.length === 0) return 0;
  let index = current;
  for (let i = 0; i < options.length; i += 1) {
    index = (index + step + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return current;
}
