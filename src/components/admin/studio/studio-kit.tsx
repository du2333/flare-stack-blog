// PROTOTYPE (throwaway): the Admin redesign, round 3. Never merge.
// What the redesigned list pages share.
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import {
  type ReactNode,
  type Ref,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { Menu, MenuItem } from "@/components/ui/menu";
import "./studio-kit.css";

/** Tabs as one track, with a pill that slides to the chosen one. */
export function SegTabs<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: T;
  items: Array<{ value: T; label: string; count?: number }>;
  onChange: (value: T) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const counts = items.map((item) => item.count).join(",");

  useLayoutEffect(() => {
    const track = trackRef.current;
    const pill = pillRef.current;
    if (!track || !pill) return;
    const place = () => {
      const chosen = track.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!chosen) return;
      pill.style.width = `${chosen.offsetWidth}px`;
      pill.style.transform = `translateX(${chosen.offsetLeft}px)`;
      if (!track.dataset.pill) {
        track.dataset.pill = "placed";
        requestAnimationFrame(() => {
          track.dataset.pill = "moving";
        });
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(track);
    return () => observer.disconnect();
  }, [value, counts]);

  return (
    <div ref={trackRef} className="sx-seg" role="tablist" aria-label={label}>
      <span ref={pillRef} className="sx-seg-pill" aria-hidden />
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count === undefined ? null : <small>{item.count}</small>}
        </button>
      ))}
    </div>
  );
}

/** The search field; "/" anywhere on the page puts the caret in it. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const ownRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        target?.closest("input, textarea, [contenteditable='true']")
      )
        return;
      event.preventDefault();
      ownRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label className="sx-search">
      <Search size={15} />
      <input
        ref={(node) => {
          ownRef.current = node;
          if (typeof inputRef === "function") inputRef(node);
          else if (inputRef) inputRef.current = node;
        }}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            if (value) onChange("");
            else event.currentTarget.blur();
          }
        }}
      />
      {value ? (
        <button
          type="button"
          aria-label="清除搜索"
          onClick={() => {
            onChange("");
            ownRef.current?.focus();
          }}
        >
          <X size={14} />
        </button>
      ) : (
        <kbd className="admin-kbd">/</kbd>
      )}
    </label>
  );
}

/** A filter or a sort as a chip that opens a menu of choices. */
export function ChipMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  neutral,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  /** The value that filters nothing: the chip shows its label alone. */
  neutral?: T;
}) {
  const chosen = options.find((option) => option.value === value);
  const filtering = neutral !== undefined && value !== neutral;
  return (
    <Menu
      label={label}
      placement="bottom-end"
      triggerClassName="sx-chip"
      trigger={
        <span
          className="contents"
          ref={(node) => {
            // The menu owns the button; mark it so the chip can show it filters.
            const button = node?.closest("button");
            if (!button) return;
            if (filtering) button.dataset.active = "";
            else delete button.dataset.active;
          }}
        >
          {neutral === undefined || filtering ? (
            <>
              {label}
              <b>{chosen?.label}</b>
            </>
          ) : (
            label
          )}
          <ChevronDown size={14} />
        </span>
      }
    >
      {options.map((option) => (
        <MenuItem
          key={option.value}
          role="menuitemradio"
          checked={option.value === value}
          onSelect={() => onChange(option.value)}
        >
          <span className="flex-1 truncate">{option.label}</span>
        </MenuItem>
      ))}
    </Menu>
  );
}

function pageNumbers(page: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const shown = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) for (const n of [2, 3, 4]) shown.add(n);
  if (page >= total - 2)
    for (const n of [total - 3, total - 2, total - 1]) shown.add(n);
  const sorted = [...shown]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];
  for (const [index, n] of sorted.entries()) {
    if (index > 0 && n - sorted[index - 1]! > 1) out.push("gap");
    out.push(n);
  }
  return out;
}

export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="sx-pager" aria-label="分页">
      <button
        type="button"
        aria-label="上一页"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>
      {pageNumbers(page, totalPages).map((n, index) =>
        n === "gap" ? (
          <span key={`gap-${index}`}>…</span>
        ) : (
          <button
            key={n}
            type="button"
            aria-current={n === page ? "page" : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="下一页"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

export function EmptyBlock({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sx-empty">
      <span className="sx-empty-icon">{icon}</span>
      <b>{title}</b>
      {text ? <span>{text}</span> : null}
      {action}
    </div>
  );
}
