import type { LucideIcon } from "lucide-react";
import { CornerDownLeft, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Kbd } from "./kbd";
import "./command-palette.css";

export interface Command {
  id: string;
  /** Commands of one group follow each other, under its name. */
  group: string;
  label: string;
  /** Muted text after the label, such as the section a page is in. */
  hint?: string;
  /** More words the filter matches, such as English names. */
  keywords?: string;
  icon: LucideIcon;
  run: () => void;
}

/** The commands whose label, hint or keywords contain what was typed. */
export function filterCommands(commands: Array<Command>, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return commands;
  return commands.filter((command) =>
    `${command.label} ${command.hint ?? ""} ${command.keywords ?? ""}`
      .toLowerCase()
      .includes(text),
  );
}

/**
 * What opens the palette: a button drawn as a search field, with the
 * shortcut that opens it too.
 */
export function CommandPaletteTrigger({
  label,
  shortcut,
  onClick,
  className,
}: {
  label: string;
  /** Shown as a key cap, such as "⌘K". */
  shortcut: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={["fuwari-palette-trigger", className]
        .filter(Boolean)
        .join(" ")}
      aria-haspopup="dialog"
      aria-keyshortcuts={shortcut.replace("⌘", "Meta+").replace(" ", "+")}
      onClick={onClick}
    >
      <Search size={15} aria-hidden />
      <span>{label}</span>
      <Kbd aria-hidden>{shortcut}</Kbd>
    </button>
  );
}

/**
 * A dialog to find and run a command: a field over a grouped list that
 * filters as one types. Arrow keys move, Enter runs, Escape or a click
 * outside closes; closing returns focus to where it was before opening.
 * Running a command closes the palette first.
 */
export function CommandPalette({
  open,
  onClose,
  commands,
  label,
  placeholder,
  empty,
  closeKey,
  selectHint,
  runHint,
}: {
  open: boolean;
  onClose: () => void;
  commands: Array<Command>;
  /** Names the dialog. */
  label: string;
  placeholder: string;
  /** What the list says when nothing matches the query. */
  empty: (query: string) => ReactNode;
  /** The key cap beside the field, such as "esc". */
  closeKey: string;
  /** The footer's hints for the arrows and for Enter. */
  selectHint: string;
  runHint: string;
}) {
  if (!open) return null;
  return createPortal(
    <PaletteDialog
      onClose={onClose}
      commands={commands}
      label={label}
      placeholder={placeholder}
      empty={empty}
      closeKey={closeKey}
      selectHint={selectHint}
      runHint={runHint}
    />,
    document.body,
  );
}

function PaletteDialog({
  onClose,
  commands,
  label,
  placeholder,
  empty,
  closeKey,
  selectHint,
  runHint,
}: Omit<Parameters<typeof CommandPalette>[0], "open">) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(
    () => filterCommands(commands, query),
    [commands, query],
  );
  const index = Math.min(active, Math.max(shown.length - 1, 0));

  // Focus goes back to where it was, unless a command moved it on.
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const scrim = scrimRef.current;
    inputRef.current?.focus();
    return () => {
      const current = document.activeElement;
      const lost =
        !current || current === document.body || scrim?.contains(current);
      if (lost && previous?.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    listRef.current
      ?.querySelector("[data-active]")
      ?.scrollIntoView({ block: "nearest" });
  }, [index, shown]);

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const count = Math.max(shown.length, 1);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index + 1) % count);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index - 1 + count) % count);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      run(shown[index]);
    } else if (event.key === "Tab") {
      // The field keeps focus; the list is walked with the arrows.
      event.preventDefault();
    }
  };

  let lastGroup = "";
  return (
    <div
      ref={scrimRef}
      className="fuwari-palette-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="fuwari-palette"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        <div className="fuwari-palette-field">
          <Search size={17} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            placeholder={placeholder}
            aria-label={placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={
              shown[index] ? `${id}-${shown[index].id}` : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
          />
          <Kbd>{closeKey}</Kbd>
        </div>
        <div
          ref={listRef}
          id={`${id}-list`}
          className="fuwari-palette-list"
          role="listbox"
          aria-label={label}
        >
          {shown.length === 0 ? (
            <p className="fuwari-palette-empty">{empty(query)}</p>
          ) : (
            shown.map((command, position) => {
              const heading =
                command.group !== lastGroup ? (
                  <div className="fuwari-palette-group" aria-hidden>
                    {command.group}
                  </div>
                ) : null;
              lastGroup = command.group;
              return (
                <div key={command.id} role="presentation">
                  {heading}
                  <button
                    type="button"
                    id={`${id}-${command.id}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={position === index}
                    data-active={position === index ? "" : undefined}
                    className="fuwari-palette-item"
                    onMouseMove={() => setActive(position)}
                    onClick={() => run(command)}
                  >
                    <command.icon size={16} strokeWidth={1.7} aria-hidden />
                    <span>{command.label}</span>
                    {command.hint ? <small>{command.hint}</small> : null}
                    <CornerDownLeft
                      size={14}
                      aria-hidden
                      className="fuwari-palette-enter"
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="fuwari-palette-foot" aria-hidden>
          <span>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {selectHint}
          </span>
          <span>
            <Kbd>↵</Kbd>
            {runHint}
          </span>
        </div>
      </div>
    </div>
  );
}
