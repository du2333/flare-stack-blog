import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import "./pick-row.css";

/**
 * A row of a master list (AdminSplit) that is chosen by clicking it: a
 * full-width button that lays out whatever it is given. `current` lights the
 * row whose detail is on show, a white slip on the list's ground; `chosen`
 * marks it also while it is not lit (a phone still on the list), so focus
 * can come back to it.
 */
export function PickRow({
  current = false,
  chosen = current,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  current?: boolean;
  chosen?: boolean;
}) {
  return (
    <button
      type={type}
      {...props}
      className={cn("admin-pick-row", className)}
      data-chosen={chosen ? "" : undefined}
      aria-current={current ? "true" : undefined}
    />
  );
}
