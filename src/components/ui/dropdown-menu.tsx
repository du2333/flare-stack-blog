import { ChevronDown } from "lucide-react";
import type React from "react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { MOTION, useMotionPresence } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownMenuProps {
  value: string;
  options: Array<DropdownOption>;
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  value,
  options,
  onChange,
  className = "",
  triggerClassName,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const present = useMotionPresence(isOpen, MOTION.popover);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

  useLayoutEffect(() => {
    if (!present) {
      setMenuStyle(null);
      return;
    }

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuHeight = 256;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      setMenuStyle({
        position: "fixed",
        right: window.innerWidth - rect.right,
        width: 11 * 16,
        top: openUp ? undefined : rect.bottom + gap,
        bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
        transformOrigin: openUp ? "bottom right" : "top right",
        "--popover-offset": openUp ? "4px" : "-4px",
      } as CSSProperties);
    };

    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [present]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (
      isOpen &&
      menuStyle &&
      !menuRef.current?.contains(document.activeElement)
    ) {
      const selected = menuRef.current?.querySelector<HTMLButtonElement>(
        '[aria-checked="true"]',
      );
      (selected ?? menuRef.current?.querySelector("button"))?.focus();
    }
  }, [isOpen, menuStyle]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 rounded-lg bg-(--fuwari-primary)/10 px-2 py-0.5 font-mono text-xs font-bold uppercase text-(--fuwari-primary)",
          triggerClassName,
        )}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown
          size={12}
          className={cn(
            "transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {present && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              data-state={isOpen ? "open" : "closing"}
              inert={!isOpen}
              aria-hidden={!isOpen}
              aria-label={ariaLabel}
              className="fuwari-popover-motion z-80 max-h-64 overflow-y-auto rounded-xl bg-(--fuwari-card-bg) p-1 shadow-md ring-1 ring-(--fuwari-input-border) custom-scrollbar"
              style={menuStyle}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const buttons = Array.from(
                    menuRef.current?.querySelectorAll("button") ?? [],
                  );
                  const index = buttons.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  const direction = event.key === "ArrowDown" ? 1 : -1;
                  buttons[
                    (index + direction + buttons.length) % buttons.length
                  ]?.focus();
                }
              }}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    "flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    value === option.value
                      ? "bg-(--fuwari-btn-regular-bg) text-(--fuwari-primary)"
                      : "fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg)/70 hover:fuwari-text-90",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default DropdownMenu;
