import type { ComponentProps } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { cn } from "@/lib/utils";
import "./field.css";

/** The Fuwari text field. Size it through `--fuwari-field-*` on a parent. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn("fuwari-input", className)} {...props} />;
}

/**
 * A multi-line `Input`; `mono` for code and templates. `bare` drops the fill,
 * border and focus ring for text typed straight into a card; `autoGrow` has
 * it grow with its content, from `rows` lines, with no resize handle.
 */
export function Textarea({
  className,
  mono = false,
  bare = false,
  autoGrow = false,
  rows,
  ...props
}: ComponentProps<"textarea"> & {
  mono?: boolean;
  bare?: boolean;
  autoGrow?: boolean;
}) {
  const shared = {
    className: cn("fuwari-input", className),
    "data-mono": mono || undefined,
    "data-bare": bare || undefined,
  };
  if (autoGrow) {
    const { style: _style, ...rest } = props;
    return <TextareaAutosize {...shared} minRows={rows ?? 1} {...rest} />;
  }
  return <textarea {...shared} rows={rows} {...props} />;
}
