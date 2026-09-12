import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

export function SettingsDisclosure({
  title,
  children,
  className,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => setOpen(defaultOpen), [defaultOpen]);
  return (
    <div className={`settings-disclosure ${className ?? ""}`}>
      <button
        type="button"
        className="settings-disclosure-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div
        id={id}
        className="settings-disclosure-content"
        data-open={open}
        inert={!open}
        aria-hidden={!open}
      >
        <div>{children}</div>
      </div>
    </div>
  );
}
