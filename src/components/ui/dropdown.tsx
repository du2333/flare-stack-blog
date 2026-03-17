import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
  danger?: boolean;
  isActive?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: Array<DropdownItem>;
  className?: string;
  align?: "left" | "right";
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  className = "",
  align = "right",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 w-40 bg-popover border border-border/30 z-50 py-1 animate-in fade-in duration-200",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-[9px] font-mono uppercase tracking-widest transition-colors flex items-center gap-2",
                item.danger
                  ? "text-destructive hover:bg-destructive/10"
                  : item.isActive
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-accent/30",
                item.className,
              )}
            >
              {item.icon && <span className="opacity-60">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
