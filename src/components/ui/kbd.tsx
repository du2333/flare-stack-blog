import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import "./kbd.css";

/** A key or a shortcut as a small grey cap, such as "⌘K" or "/". */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd {...props} className={cn("admin-kbd", className)} />;
}
