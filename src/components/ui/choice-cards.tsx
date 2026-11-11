import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { moveSelection } from "./roving-selection";
import "./choice-cards.css";

export interface ChoiceCard<T extends string> {
  value: T;
  label: ReactNode;
  /** A picture of the choice, above its label. */
  media: ReactNode;
  /** A control under the card, such as a link; it is not part of the choice. */
  action?: ReactNode;
}

/**
 * Cards where exactly one is chosen, as a `radiogroup`: arrow keys, Home and
 * End move the choice, and Tab reaches the chosen card and each action.
 */
export function ChoiceCards<T extends string>({
  items,
  value,
  onValueChange,
  className,
  ...props
}: Omit<ComponentProps<"div">, "role" | "onChange" | "children"> & {
  items: ReadonlyArray<ChoiceCard<T>>;
  value: T;
  onValueChange: (value: T) => void;
}) {
  // With no card chosen, the first one takes the focus.
  const focusable = items.some((item) => item.value === value)
    ? value
    : items[0]?.value;
  return (
    <div
      {...props}
      role="radiogroup"
      className={cn("fuwari-choice-cards", className)}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).getAttribute("role") !== "radio") {
          return;
        }
        moveSelection(event, items, value, onValueChange);
      }}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <div
            key={item.value}
            className="fuwari-choice-card"
            data-checked={selected || undefined}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={item.value === focusable ? 0 : -1}
              data-value={item.value}
              className="fuwari-choice-card-option"
              onClick={() => onValueChange(item.value)}
            >
              <span className="fuwari-choice-card-media">{item.media}</span>
              <span className="fuwari-choice-card-label">{item.label}</span>
              {selected ? (
                <span className="fuwari-choice-card-mark" aria-hidden="true">
                  <Check size={13} strokeWidth={3} />
                </span>
              ) : null}
            </button>
            {item.action ? (
              <div className="fuwari-choice-card-action">{item.action}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
