import {
  BellOff,
  Check,
  CircleAlert,
  ExternalLink,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { NoticeSheet } from "./notice-sheet";
// The warning is the callout's class on the row's own root (see callout.tsx),
// so the primitive's stylesheet is imported here, as `Callout` itself does.
import "@/components/ui/callout.css";

/**
 * What the block knows. `pending` is the first check running with nothing
 * known; `failed` is a first check that failed. With an answer (`ready`) the
 * block shows it, and `activity` says whether a check is running or the last
 * one failed, the answer staying on screen either way.
 */
export type UpdateStatus =
  | { kind: "pending" }
  | { kind: "failed" }
  | {
      kind: "ready";
      result: UpdateCheckResult;
      activity: "idle" | "checking" | "failed";
    };

/**
 * The last change to the dismissal: running, failed (the block is as it was)
 * or done. The outcomes are announced from the block's live regions.
 */
export type DismissalChange =
  | { kind: "idle" }
  | { kind: "pending"; of: "dismiss" | "restore" }
  | { kind: "failed"; of: "dismiss" | "restore" }
  | { kind: "done"; of: "dismiss" | "restore" };

type Entry = UpdateCheckResult["entries"][number];

/**
 * What the Admin is told about updates: one line, by the size of the step to
 * the latest release (the result's `level`). The line says what is there and
 * how many versions or things to do; a major is the same line as a compact
 * warning row. The details (what to do before syncing, each version's
 * summary, the release notes, 「不再提醒此版本」) open in a sheet from
 * 「查看」. Every state keeps 「重新检查」. An update can be dismissed for its
 * version (the result's `dismissed`); the line then says so, still naming a
 * major, and 「恢复提醒」 brings the full form back.
 *
 * One tree serves every state: the root, the text, the first control, the
 * recheck button and the live regions keep their place, so keyboard focus
 * stays on a control while the answer changes the line around it.
 *
 * The notes come from a fetched file: every string here is a text node, never
 * HTML, Markdown or a link.
 */
export function UpdateBlock({
  status,
  change,
  onRecheck,
  onDismiss,
  onRestore,
  onOpenDetails,
}: {
  status: UpdateStatus;
  change: DismissalChange;
  onRecheck: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  /** The details were opened: the last change's failure is over. */
  onOpenDetails?: () => void;
}) {
  const result = status.kind === "ready" ? status.result : null;
  const checking =
    status.kind === "pending" ||
    (status.kind === "ready" && status.activity === "checking");
  const failed =
    status.kind === "failed" ||
    (status.kind === "ready" && status.activity === "failed");
  const form = formOf(status);
  const dismissed = form === "dismissed";
  const active = form === "patch" || form === "minor" || form === "major";

  // The first control: 「查看」 while there is something to see, 「恢复提醒」
  // once it is ignored. One element for both, so focus stays on it when the
  // line turns from one into the other.
  const firstControl = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const detailsOpen = open && active;
  useEffect(() => {
    if (!open || active) return;
    // The sheet's subject is gone: it was ignored from the sheet (focus goes
    // to 「恢复提醒」), or a check found nothing to show.
    setOpen(false);
    if (dismissed) firstControl.current?.focus();
  }, [open, active, dismissed]);

  // An outcome is announced while the form agrees with it: a later answer
  // that moves the block on (a newer version) does not announce it again.
  const announced =
    change.kind === "done" && result?.hasUpdate
      ? change.of === "dismiss" && dismissed
        ? m.admin_overview_update_dismiss_done({
            version: result.latestVersion,
          })
        : change.of === "restore" && !dismissed
          ? m.admin_overview_update_restore_done()
          : ""
      : "";
  // A failed dismissal is said inside the sheet, which stays open for it; a
  // failed restore and a failed check are said on the line.
  const dismissFailure =
    change.kind === "failed" && change.of === "dismiss"
      ? m.admin_overview_update_dismiss_failed()
      : "";
  const lineFailure =
    change.kind === "failed" && change.of === "restore"
      ? m.admin_overview_update_restore_failed()
      : failed && !checking
        ? m.admin_overview_update_failed()
        : "";
  const changing = change.kind === "pending";
  const firstLabel = dismissed
    ? m.admin_overview_update_restore()
    : m.admin_overview_update_view();
  const text = lineText(form, result);

  return (
    <>
      <div
        className={cn(
          "overview-line overview-update",
          form === "major" && "fuwari-callout",
        )}
        data-state={form}
        data-tone={form === "major" ? "warning" : undefined}
      >
        <div className="overview-line-text">
          <span className="overview-line-mark" aria-hidden>
            {mark(form)}
          </span>
          <div className="overview-line-words">
            {form === "pending" ? (
              <Skeleton shimmer className="overview-update-skeleton" />
            ) : form === "major" ? (
              // A major is announced once, from its own text, when it arrives.
              <span key="major" role="alert">
                {text}
              </span>
            ) : (
              <span key="text">{text}</span>
            )}
            {/* The regions stay mounted and only their text changes. */}
            <span
              role="alert"
              className="overview-line-failure"
              data-tone="danger"
            >
              {lineFailure}
            </span>
          </div>
        </div>
        <div className="overview-line-actions">
          {result?.hasUpdate ? (
            <Button
              ref={firstControl}
              variant="quiet"
              size="xs"
              data-notices-anchor=""
              {...working(dismissed && changing)}
              aria-haspopup={dismissed ? undefined : "dialog"}
              aria-expanded={dismissed ? undefined : detailsOpen}
              onClick={(event) => {
                if (dismissed) {
                  if (!changing) onRestore();
                  return;
                }
                // Safari does not focus a button when it is clicked.
                event.currentTarget.focus();
                onOpenDetails?.();
                setOpen(true);
              }}
            >
              {firstLabel}
            </Button>
          ) : null}
          {form === "pending" ? null : (
            <IconButton
              size="xs"
              variant="quiet"
              label={m.admin_overview_update_recheck()}
              data-notices-anchor={result?.hasUpdate ? undefined : ""}
              aria-disabled={checking || undefined}
              aria-busy={checking || undefined}
              onClick={() => {
                if (!checking) onRecheck();
              }}
            >
              {checking ? <Spinner size={14} /> : <RefreshCw size={14} />}
            </IconButton>
          )}
          {/* Assistive tech only: the spinner and the line say it for sight. */}
          <span role="status" className="sr-only">
            {checking ? m.admin_overview_update_checking() : announced}
          </span>
        </div>
      </div>
      {result && active ? (
        <NoticeSheet
          open={detailsOpen}
          onClose={() => setOpen(false)}
          title={m.admin_overview_update_step({
            from: `v${result.currentVersion}`,
            to: result.latestVersion,
          })}
          badge={levelBadge(result)}
          failure={dismissFailure}
          actions={
            <>
              <a
                href={result.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: "outline", size: "sm" })}
              >
                {m.admin_overview_update_notes_link()}
                <ExternalLink size={14} aria-hidden />
              </a>
              <Button
                variant="outline"
                size="sm"
                {...working(changing)}
                onClick={() => {
                  if (!changing) onDismiss();
                }}
              >
                {m.admin_overview_update_dismiss()}
              </Button>
              <Button
                variant="quiet"
                size="sm"
                {...working(checking)}
                onClick={() => {
                  if (!checking) onRecheck();
                }}
              >
                {m.admin_overview_update_recheck()}
              </Button>
            </>
          }
        >
          <Details result={result} />
        </NoticeSheet>
      ) : null}
    </>
  );
}

/**
 * A control whose work is running shows a spinner and says it is not
 * available, but stays enabled: a disabled control would drop keyboard focus to the page
 * (and out of a sheet, where Escape needs it), so its handler ignores a press.
 */
function working(busy: boolean) {
  return {
    icon: busy ? <Spinner size={14} /> : undefined,
    "aria-disabled": busy || undefined,
  };
}

type Form =
  | "pending"
  | "failed"
  | "current"
  | "dismissed"
  | "patch"
  | "minor"
  | "major";

function formOf(status: UpdateStatus): Form {
  if (status.kind !== "ready") return status.kind;
  const { result } = status;
  if (!result.hasUpdate) return "current";
  if (result.dismissed) return "dismissed";
  return result.level === "major" || result.level === "minor"
    ? result.level
    : "patch";
}

function mark(form: Form): ReactNode {
  if (form === "current") return <Check size={14} className="is-accent" />;
  if (form === "dismissed") return <BellOff size={14} />;
  if (form === "failed") return <CircleAlert size={14} />;
  if (form === "major") return <TriangleAlert size={18} />;
  if (form === "patch" || form === "minor") return <i />;
  return null;
}

/** The sentence of the line; the failure beside it is its own region. */
function lineText(form: Form, result: UpdateCheckResult | null): string {
  if (!result) return "";
  const version = result.latestVersion;
  if (form === "current")
    return m.admin_overview_update_up_to_date({
      current: result.currentVersion,
    });
  if (form === "dismissed")
    return (
      result.level === "major"
        ? m.admin_overview_update_dismissed_major
        : m.admin_overview_update_dismissed
    )({ version });
  if (form === "major")
    return !hasNotes(result)
      ? m.admin_overview_update_major_unavailable({ version })
      : beforeCount(result) > 0
        ? m.admin_overview_update_major_todo({
            version,
            count: beforeCount(result),
          })
        : m.admin_overview_update_major_nothing({ version });
  if (form === "minor" || form === "patch") {
    if (!hasNotes(result))
      return m.admin_overview_update_available_unavailable({ version });
    return form === "minor" && result.entries.length > 1
      ? m.admin_overview_update_available_many({
          version,
          count: result.entries.length,
        })
      : m.admin_overview_update_available({ version });
  }
  return "";
}

function levelBadge(result: UpdateCheckResult) {
  if (result.level === "major")
    return (
      <Badge tone="warning">{m.admin_overview_update_level_major()}</Badge>
    );
  if (result.level === "minor")
    return (
      <Badge tone="primary">{m.admin_overview_update_level_minor()}</Badge>
    );
  return <Badge>{m.admin_overview_update_level_patch()}</Badge>;
}

/**
 * What the sheet lists: for a major, what to do before syncing, by version;
 * then each version's summary. Without notes, the one sentence.
 */
function Details({ result }: { result: UpdateCheckResult }) {
  if (!hasNotes(result))
    return (
      <p className="overview-sheet-note">
        {m.admin_overview_update_notes_unavailable()}
      </p>
    );
  const todo = result.level === "major" ? withBefore(result) : [];
  return (
    <>
      {todo.length > 0 ? (
        <section className="overview-sheet-section">
          <h3>{m.admin_overview_update_before()}</h3>
          {todo.map((entry) => (
            <div key={entry.version}>
              <p className="overview-sheet-version">v{entry.version}</p>
              <ul className="overview-sheet-todo">
                {entry.before?.map((item, index) => (
                  <li key={`${item.id}-${index}`}>{item.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
      <section className="overview-sheet-section">
        <h3>{m.admin_overview_update_summaries()}</h3>
        <Summaries entries={result.entries} />
      </section>
    </>
  );
}

function hasNotes(result: UpdateCheckResult) {
  return result.notesAvailable && result.entries.length > 0;
}

function withBefore(result: UpdateCheckResult) {
  return result.entries.filter((entry) => (entry.before?.length ?? 0) > 0);
}

/** The `before` items of every crossed version. */
function beforeCount(result: UpdateCheckResult) {
  return result.entries.reduce(
    (sum, entry) => sum + (entry.before?.length ?? 0),
    0,
  );
}

/** One line per version, oldest first: the version, then its summary. */
function Summaries({ entries }: { entries: ReadonlyArray<Entry> }) {
  return (
    <ol className="overview-sheet-list">
      {entries.map((entry) => (
        <li key={entry.version}>
          <b>v{entry.version}</b>
          <span>{entry.summary}</span>
        </li>
      ))}
    </ol>
  );
}
