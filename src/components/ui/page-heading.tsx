import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import "./page-heading.css";

/** An Admin page's title, what the page is for, and its actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("fuwari-page-header", className)}>
      <div className="fuwari-heading-text">
        <h1>{title}</h1>
        {description === undefined ? null : <p>{description}</p>}
      </div>
      {actions ? <div className="fuwari-heading-actions">{actions}</div> : null}
    </header>
  );
}

/** A section's title inside an Admin page, with an optional line and actions. */
export function SectionHeading({
  title,
  description,
  actions,
  level = 2,
  size = "lg",
  align = "center",
  titleProps,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  level?: 2 | 3;
  size?: "lg" | "md" | "sm";
  /** "baseline" sets the actions on the title's first line, for a badge beside a heading that has a description. */
  align?: "center" | "baseline";
  titleProps?: HTMLAttributes<HTMLHeadingElement> & {
    ref?: Ref<HTMLHeadingElement>;
  };
  className?: string;
}) {
  const Title = level === 2 ? "h2" : "h3";
  return (
    <header
      className={cn("fuwari-section-heading", className)}
      data-size={size}
      data-align={align}
    >
      <div className="fuwari-heading-text">
        <Title {...titleProps}>{title}</Title>
        {description === undefined ? null : <p>{description}</p>}
      </div>
      {actions ? <div className="fuwari-heading-actions">{actions}</div> : null}
    </header>
  );
}

/** A public page's title with the accent bar, a way back, and an intro. */
export function PublicPageHeading({
  title,
  back,
  description,
  className,
}: {
  title: ReactNode;
  back: { to: LinkProps["to"]; label: ReactNode };
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("fuwari-public-heading", className)}>
      <h1>{title}</h1>
      <Link to={back.to}>
        <ArrowLeft size={16} />
        {back.label}
      </Link>
      {description === undefined ? null : <p>{description}</p>}
    </header>
  );
}
