import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import "./button.css";

export type ButtonVariant =
  | "primary"
  | "regular"
  | "plain"
  | "danger"
  | "text"
  | "overlay"
  // The Admin's own (admin-variables.css), on their own scale: xs 28px,
  // sm 30px, md 36px. inverse and glass sit on a dark card.
  | "ink"
  | "outline"
  | "quiet"
  | "inverse"
  | "glass";
/** xs (28px) is for the Admin's variants only. */
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** On `plain`, a muted button that turns red on hover; on `text`, red text. */
  tone?: "danger";
  className?: string;
}

/** The look of a `Button`, for links that look like one. */
export function buttonClass({
  variant = "regular",
  size = "md",
  tone,
  className,
}: ButtonStyle = {}) {
  return cn(
    "fuwari-button",
    `fuwari-button-${variant}`,
    `fuwari-button-${size}`,
    tone === "danger" && "fuwari-button-tone-danger",
    className,
  );
}

/**
 * The Fuwari button. `loading` swaps the leading `icon` for a spinner and
 * disables the button until the work is done.
 */
export function Button({
  variant,
  size = "md",
  tone,
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> &
  ButtonStyle & {
    loading?: boolean;
    /** A leading icon, replaced by the spinner while `loading`. */
    icon?: ReactNode;
  }) {
  return (
    <button
      type={type}
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, tone, className })}
    >
      {loading ? (
        <Spinner size={size === "sm" || size === "xs" ? 14 : 16} />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
