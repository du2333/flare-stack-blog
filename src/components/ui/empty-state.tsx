import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./empty-state.css";

/**
 * A centred icon, title and muted text with optional actions, for a list or
 * panel with nothing to show. `compact` fits inside a narrow column. The
 * `tile` variant (the Admin's list card) sets the icon on a grey tile and
 * fills the space it is given.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "regular",
  variant = "plain",
  className,
  ...props
}: Omit<ComponentProps<"div">, "title" | "children"> & {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  size?: "compact" | "regular";
  variant?: "plain" | "tile";
}) {
  const tile = variant === "tile";
  const icon = Icon ? (
    <Icon
      size={tile ? 20 : size === "compact" ? 24 : 32}
      strokeWidth={tile ? 2 : 1.5}
      aria-hidden="true"
      className={tile ? undefined : "fuwari-empty-icon"}
    />
  ) : null;
  return (
    <div
      {...props}
      className={cn("fuwari-empty", className)}
      data-size={size}
      data-variant={tile ? "tile" : undefined}
    >
      {tile && icon ? <span className="fuwari-empty-tile">{icon}</span> : icon}
      {title ? <h2 className="fuwari-empty-title">{title}</h2> : null}
      {description ? (
        <div className="fuwari-empty-description">{description}</div>
      ) : null}
      {action ? <div className="fuwari-empty-actions">{action}</div> : null}
    </div>
  );
}
