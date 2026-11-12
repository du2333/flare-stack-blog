import {
  useId,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { Button } from "@/components/ui/button";
import { DisclosureChevron, DisclosurePanel } from "@/components/ui/disclosure";
import { TabsVariant } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  type AdminPageAction,
  useAdminChrome,
  useAdminPrimaryAction,
} from "./admin-chrome";
import { riseOrder } from "./rise";
import "@/components/ui/tabs.css";
import "./content-workspace.css";
import "./admin-page.css";

/**
 * The page frame every Admin page shares, except the post editor and its
 * history, which keep their own top bar. How to use it:
 * docs/admin-page-frame.md.
 *
 * Row one: the title, its count, at most one primary action on the right,
 * secondary actions to its left; an optional one-line description. Row two
 * (optional): view tabs on the left, tools on the right. Both rows stay at the
 * top while the body scrolls, with a hairline under them. Below 1024px the
 * top bar carries the title and the primary action instead.
 *
 * The head, the bar and the body rise in one after another; tabs in the head
 * take their segmented form.
 *
 * The body takes one of three forms:
 * - `list`: one card, full width, for a list;
 * - `form`: settings rows (AdminFormRow), name and description on the left
 *   and the control on the right from 1024px, stacked below;
 * - `split`: master and detail side by side, each scrolling on its own.
 */
export type AdminPageBodyForm = "list" | "form" | "split";

export type { AdminPageAction };

interface AdminPageProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "title" | "children"
> {
  title: ReactNode;
  /** The number of things on the page, set right after the title. */
  count?: ReactNode;
  /** One line on what the page is for, only where the page needs it. */
  description?: ReactNode;
  /** The page's one primary action; also shown in the phone top bar. */
  primaryAction?: AdminPageAction | null;
  /** Secondary actions, left of the primary one (or an ActionMenu). */
  actions?: ReactNode;
  /** View tabs, left on row two. */
  tabs?: ReactNode;
  /** Search, filters, sort, view switch: right on row two. */
  tools?: ReactNode;
  /** Row two built by the page itself, around AdminPageToolbar; replaces tabs and tools. */
  toolbar?: ReactNode;
  body: AdminPageBodyForm;
  /**
   * Whether the body is the scroller. On by default for `list` and `form`;
   * a body with scrollers of its own (a pinned footer, two panes) turns it
   * off and gives each scroller `flex: 1; min-height: 0`.
   */
  scroll?: boolean;
  bodyRef?: Ref<HTMLDivElement>;
  /** Names the body region, for a page whose body is the scroller. */
  bodyLabel?: string;
  /**
   * A list or split body is a card padded by the frame's inset. A list
   * whose pieces pad themselves (ListCardColumns, ListCardRows,
   * ListCardFoot) turns it off.
   */
  inset?: boolean;
  /** A thin line runs along the top of a list or split body while true. */
  loading?: boolean;
  /**
   * Below 768px the whole page scrolls, the head with it, and the body grows
   * with its content, for a long list read on a phone. The page element is
   * then the scroller.
   */
  stackOnPhone?: boolean;
  children: ReactNode;
}

export function AdminPage({
  title,
  count,
  description,
  primaryAction,
  actions,
  tabs,
  tools,
  toolbar,
  body,
  scroll = body !== "split",
  bodyRef,
  bodyLabel,
  inset = true,
  loading = false,
  stackOnPhone = false,
  className,
  children,
  ...rest
}: AdminPageProps) {
  useAdminPrimaryAction(primaryAction);
  const row =
    toolbar ??
    (tabs || tools ? <AdminPageToolbar tabs={tabs} tools={tools} /> : null);

  return (
    <section
      {...rest}
      className={cn("admin-page admin-workspace admin-frame", className)}
      data-body={body}
      data-stack={stackOnPhone ? "" : undefined}
    >
      <TabsVariant value="segmented">
        <div className="admin-page-head">
          <AdminPageHeader
            title={title}
            count={count}
            description={description}
            actions={actions}
            hasToolbar={row !== null}
          />
          {row ? (
            <div className="admin-page-bar admin-rise" style={riseOrder(1)}>
              {row}
            </div>
          ) : null}
        </div>
      </TabsVariant>
      <div
        ref={bodyRef}
        className={cn(
          "admin-page-body admin-rise",
          scroll && "custom-scrollbar",
        )}
        style={riseOrder(2)}
        data-form={body}
        data-scroll={scroll ? "" : undefined}
        data-inset={inset ? undefined : "none"}
        data-loading={loading ? "" : undefined}
        role={bodyLabel ? "region" : undefined}
        aria-label={bodyLabel}
        tabIndex={bodyLabel && scroll ? 0 : undefined}
      >
        {children}
      </div>
    </section>
  );
}

/** Row one. The primary action is whatever the page registered. */
function AdminPageHeader({
  title,
  count,
  description,
  actions,
  hasToolbar,
}: {
  title: ReactNode;
  count?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  hasToolbar: boolean;
}) {
  const { primaryAction } = useAdminChrome();
  return (
    <header
      className="admin-page-header admin-rise"
      style={riseOrder(0)}
      data-toolbar={hasToolbar ? "" : undefined}
      data-compact={
        // Below 1024px the top bar has the title and the primary action;
        // the row stays only for what the top bar leaves out.
        description == null && !actions ? "" : undefined
      }
    >
      <div className="admin-page-heading">
        <div className="admin-page-title-line">
          <h1>{title}</h1>
          {count == null ? null : (
            <span className="admin-page-count">{count}</span>
          )}
        </div>
        {description == null ? null : (
          <p className="admin-page-description">{description}</p>
        )}
      </div>
      {actions || primaryAction ? (
        <div className="admin-page-actions">
          {actions}
          {primaryAction ? (
            <Button
              ref={primaryAction.ref}
              variant="ink"
              className="admin-page-primary"
              icon={primaryAction.icon}
              loading={primaryAction.loading}
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

/**
 * Row two: view tabs on the left, tools on the right, a hairline under both.
 * Use it directly when a page builds row two itself and passes it as
 * AdminPage's `toolbar`.
 */
export function AdminPageToolbar({
  tabs,
  tools,
  className,
}: {
  tabs?: ReactNode;
  tools?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("admin-frame-toolbar admin-page-toolbar", className)}>
      {tabs ?? <span />}
      {tools ? <div className="admin-page-tools">{tools}</div> : null}
    </div>
  );
}

/**
 * One setting in a `form` body: its name and description on the left, the
 * control on the right (at most 480px) from 1024px; stacked below.
 */
export function AdminFormRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  /** The control's id, so the name is its label. */
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="admin-form-row">
      <div className="admin-form-row-text">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="admin-form-row-label">
            {label}
          </label>
        ) : (
          <p className="admin-form-row-label">{label}</p>
        )}
        {description == null ? null : (
          <p className="admin-form-row-description">{description}</p>
        )}
      </div>
      <div className="admin-form-row-control">{children}</div>
    </div>
  );
}

/**
 * A titled group of settings in a `form` body: a section title (with an
 * optional line, and `status` beside the title), then its AdminFormRows,
 * with a hairline between groups. `collapsible` turns the heading into a
 * disclosure that opens the group in place.
 */
export function AdminFormSection({
  title,
  description,
  status,
  collapsible = false,
  defaultOpen = !collapsible,
  summary,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Beside the title: a status chip. */
  status?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** On a collapsible group, after the title: what is set, in a few words. */
  summary?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const heading = (
    <>
      <h2 className="admin-form-section-title">{title}</h2>
      {status}
      {summary == null ? null : (
        <span className="admin-form-section-summary">{summary}</span>
      )}
    </>
  );
  return (
    <section className={cn("admin-form-section", className)}>
      {collapsible ? (
        <button
          type="button"
          className="admin-form-section-head admin-form-section-trigger"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {heading}
          <DisclosureChevron />
        </button>
      ) : (
        <div className="admin-form-section-head">{heading}</div>
      )}
      {description == null ? null : (
        <p className="admin-form-section-description">{description}</p>
      )}
      {collapsible ? (
        <DisclosurePanel id={id} open={open}>
          <div className="admin-form-section-body">{children}</div>
        </DisclosurePanel>
      ) : (
        <div className="admin-form-section-body">{children}</div>
      )}
    </section>
  );
}
