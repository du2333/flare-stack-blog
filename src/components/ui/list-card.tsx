import { ArrowDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./list-card.css";

/*
 * The pieces of a list in a card: the Admin page frame's list body
 * (AdminPage body="list" inset={false}) is the card, and these pad
 * themselves inside it: the column names, the rows that scroll, the foot.
 */

/** The row of column names; the page sets its grid. */
export function ListCardColumns({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      role="row"
      {...props}
      className={cn("fuwari-list-card-cols", className)}
    />
  );
}

/** The rows, the part of the card that scrolls. */
export function ListCardRows({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("fuwari-list-card-rows", className)} />;
}

/** The foot under the rows: a count on the left, the pages on the right. */
export function ListCardFoot({
  className,
  ...props
}: ComponentProps<"footer">) {
  return (
    <footer {...props} className={cn("fuwari-list-card-foot", className)} />
  );
}

/**
 * A column name that sorts the list by its column; the sorted one is
 * pressed and shows the direction.
 */
export function SortHeader({
  active,
  label,
  onSort,
  children,
}: {
  active: boolean;
  /** The accessible name, such as "Sort by views". */
  label: string;
  onSort: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="fuwari-sort-header"
      aria-pressed={active}
      aria-label={label}
      onClick={onSort}
    >
      {children}
      {active ? <ArrowDown size={12} aria-hidden /> : null}
    </button>
  );
}
