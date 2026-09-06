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
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  value,
  options,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

  useLayoutEffect(() => {
    if (!isOpen) {
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
      });
    };

    update();
    window.addEventListener("resize", update);
    document.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", update, true);
    };
  }, [isOpen]);

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

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-lg bg-(--fuwari-primary)/10 px-2 py-0.5 font-mono text-xs font-bold uppercase text-(--fuwari-primary)"
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

      {isOpen && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              className="z-80 max-h-64 overflow-y-auto rounded-xl bg-(--fuwari-card-bg) p-1 shadow-md ring-1 ring-(--fuwari-input-border) custom-scrollbar"
              style={menuStyle}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
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
