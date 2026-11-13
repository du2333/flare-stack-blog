import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./button.css";

export interface IconButtonStyle {
  /** xs 28px, sm 32px, md 36px, lg 44px (the public toolbar). */
  size?: "xs" | "sm" | "md" | "lg";
  /**
   * plain (the default) rests muted and tints on hover. The Admin's ink is
   * a solid ink square, its quiet a muted one on a card.
   */
  variant?: "plain" | "ink" | "quiet";
  /** Turns red on hover, for destructive actions. */
  tone?: "danger";
  /** Shows the on state, for links; buttons get it from `aria-pressed`. */
  active?: boolean;
  className?: string;
}

/** The look of a square icon button, for links that look like one. */
export function iconButtonClass({
  size = "sm",
  variant = "plain",
  tone,
  active = false,
  className,
}: IconButtonStyle = {}) {
  return cn(
    "fuwari-icon-button",
    `fuwari-icon-button-${size}`,
    variant !== "plain" && `fuwari-icon-button-${variant}`,
    tone === "danger" && "fuwari-button-tone-danger",
    active && "fuwari-icon-button-active",
    className,
  );
}

interface IconButtonProps
  extends
    Omit<ComponentProps<"button">, "aria-label" | "title">,
    Omit<IconButtonStyle, "active"> {
  /** Names the button for screen readers and as its tooltip. */
  label: string;
  /** Set for toggles: whether it is on. Leave unset for actions. */
  active?: boolean;
  /** The icon. */
  children: ReactNode;
}

/** A square button showing only an icon, named by `label`. */
export function IconButton({
  label,
  active,
  size,
  variant,
  tone,
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      {...props}
      aria-label={label}
      title={label}
      className={iconButtonClass({ size, variant, tone, active, className })}
    >
      {children}
    </button>
  );
}
