import { ChevronLeft, ChevronRight } from "lucide-react";
import "./pagination.css";

/**
 * The page numbers to show: all of them up to seven, otherwise the first,
 * the last and the neighbours of the current one (three at either end),
 * with a gap where numbers are left out.
 */
export function pageNumbers(
  page: number,
  total: number,
): Array<number | "gap"> {
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

/**
 * Compact page buttons (the Admin's list card, admin-variables.css): the
 * arrows and the numbers, the current one in ink. Renders nothing for a
 * single page.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  label,
  previousLabel,
  nextLabel,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Names the navigation landmark. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      className={["fuwari-pagination", className].filter(Boolean).join(" ")}
      aria-label={label}
    >
      <button
        type="button"
        aria-label={previousLabel}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      {pageNumbers(page, totalPages).map((n, index) =>
        n === "gap" ? (
          <span key={`gap-${index}`} aria-hidden>
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPageChange(n)}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label={nextLabel}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  );
}
