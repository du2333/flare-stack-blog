import { Search, X } from "lucide-react";
import { useEffect, useRef, type ComponentProps, type Ref } from "react";
import { Kbd } from "./kbd";
import "./field.css";

/** Typing into these already uses the key; the shortcut leaves them alone. */
const TYPING = "input, textarea, select, [contenteditable='true']";

/**
 * A search box: icon, input, and a clear button while there is a query.
 * `lg` is the public search page's headline field. `raised` is the Admin's
 * list toolbar field: a white field that widens while in use.
 *
 * With `shortcut` (such as "/"), that key anywhere on the page puts the
 * caret in the field, the field shows the key while empty, and Escape in an
 * empty field leaves it.
 */
export function SearchField({
  ref,
  value,
  onValueChange,
  clearLabel,
  onClear,
  size = "md",
  variant = "default",
  shortcut,
  className,
  onKeyDown,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "size" | "ref"> & {
  ref?: Ref<HTMLInputElement>;
  value: string;
  onValueChange: (value: string) => void;
  clearLabel: string;
  /** Runs after the query is cleared; focus has returned to the input. */
  onClear?: () => void;
  size?: "md" | "lg";
  variant?: "default" | "raised";
  shortcut?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const raised = variant === "raised";

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.key !== shortcut ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof Element && target.closest(TYPING))
      )
        return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);

  return (
    <div
      role="search"
      className={["fuwari-field-shell", className].filter(Boolean).join(" ")}
      data-size={size}
      data-variant={raised ? "raised" : undefined}
    >
      <Search
        size={raised ? 15 : size === "lg" ? 20 : 17}
        strokeWidth={raised ? 2 : 1.75}
        aria-hidden
      />
      <input
        {...props}
        ref={(node) => {
          inputRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || event.key !== "Escape" || !shortcut)
            return;
          if (value) onValueChange("");
          else event.currentTarget.blur();
        }}
      />
      {value ? (
        <button
          type="button"
          className="fuwari-field-button"
          aria-label={clearLabel}
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
            onClear?.();
          }}
        >
          <X size={raised ? 14 : size === "lg" ? 18 : 16} />
        </button>
      ) : shortcut ? (
        <Kbd aria-hidden>{shortcut}</Kbd>
      ) : null}
    </div>
  );
}
