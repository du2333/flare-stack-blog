import { Check, ChevronRight, TriangleAlert } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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

type Entry = UpdateCheckResult["entries"][number];

/**
 * What the Admin is told about updates, by the size of the step to the
 * latest release (the result's `level`): a patch is one line with a link, a
 * minor is a card with each version's summary, a major is a standing warning
 * with what to do before syncing, and none of them can be dismissed. With
 * no update there is one quiet line. Every state keeps 「重新检查」.
 *
 * One tree serves every state: the root, its two children, the control and
 * the two live regions keep their place, so keyboard focus stays on the
 * control while the answer changes the form around it.
 *
 * The notes come from a fetched file: every string here is a text node, never
 * HTML, Markdown or a link.
 */
export function UpdateBlock({
  status,
  onRecheck,
}: {
  status: UpdateStatus;
  onRecheck: () => void;
}) {
  const result = status.kind === "ready" ? status.result : null;
  const checking =
    status.kind === "pending" ||
    (status.kind === "ready" && status.activity === "checking");
  const failed =
    status.kind === "failed" ||
    (status.kind === "ready" && status.activity === "failed");
  const form = formOf(status);

  return (
    <div
      className={cn(
        "overview-update",
        form === "minor" && "overview-card",
        form === "major" && "fuwari-callout",
      )}
      data-state={form}
      data-line={form === "minor" || form === "major" ? undefined : ""}
      data-tone={form === "major" ? "warning" : undefined}
    >
      <div className="overview-update-main">{main(form, result)}</div>
      <div className="overview-update-actions">
        {result?.hasUpdate ? (
          <a
            href={result.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: "quiet", size: "xs" })}
          >
            {m.admin_overview_update_notes_link()}
            <ChevronRight size={14} aria-hidden />
          </a>
        ) : null}
        {/* The live regions stay mounted and only their text changes. */}
        <span role="status" className="overview-update-status">
          {checking ? m.admin_overview_update_checking() : ""}
        </span>
        <span
          role="alert"
          className="overview-update-status"
          data-tone="danger"
        >
          {failed && !checking
            ? result
              ? m.admin_overview_update_failed_kept()
              : m.admin_overview_update_failed()
            : ""}
        </span>
        <Button
          variant="outline"
          size="xs"
          loading={checking}
          onClick={onRecheck}
        >
          {m.admin_overview_update_recheck()}
        </Button>
      </div>
    </div>
  );
}

type Form = "pending" | "failed" | "current" | "patch" | "minor" | "major";

function formOf(status: UpdateStatus): Form {
  if (status.kind !== "ready") return status.kind;
  const { result } = status;
  if (!result.hasUpdate) return "current";
  return result.level === "major" || result.level === "minor"
    ? result.level
    : "patch";
}

function main(form: Form, result: UpdateCheckResult | null) {
  if (form === "pending")
    return <Skeleton shimmer className="overview-update-skeleton" />;
  if (!result) return null;
  if (form === "current")
    return (
      <p className="overview-update-text" data-quiet="">
        <Check size={14} aria-hidden />
        {m.admin_overview_update_up_to_date({
          current: result.currentVersion,
        })}
      </p>
    );
  if (form === "patch")
    return (
      <p className="overview-update-text">
        <i aria-hidden />
        {m.admin_overview_update_available({ version: result.latestVersion })}
      </p>
    );
  if (form === "minor")
    return (
      <>
        <header className="overview-card-head">
          <h2 className="overview-card-title">
            {m.admin_overview_update_available({
              version: result.latestVersion,
            })}
          </h2>
          <span className="overview-card-sub">
            {m.admin_overview_update_current({
              current: result.currentVersion,
            })}
          </span>
        </header>
        <div className="overview-update-body">
          <Notes result={result} sections={false} />
        </div>
      </>
    );
  if (form === "major") return <Warning result={result} />;
  return null;
}

/** The notes of the versions crossed, or one sentence when there are none. */
function Notes({
  result,
  sections,
}: {
  result: UpdateCheckResult;
  /** A major names its parts: what to do first, then the summaries. */
  sections: boolean;
}) {
  if (!hasNotes(result))
    return (
      <p className="overview-update-unavailable">
        {m.admin_overview_update_notes_unavailable()}
      </p>
    );
  const todo = sections ? withBefore(result) : [];
  return (
    <>
      {todo.length > 0 ? (
        <section className="overview-update-section">
          <h2>{m.admin_overview_update_before()}</h2>
          {todo.map((entry) => (
            <div key={entry.version}>
              <p className="overview-update-version">v{entry.version}</p>
              <ul className="overview-update-todo">
                {entry.before?.map((item, index) => (
                  <li key={`${item.id}-${index}`}>{item.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
      {sections ? (
        <section className="overview-update-section">
          <h2>{m.admin_overview_update_summaries()}</h2>
          <Summaries entries={result.entries} />
        </section>
      ) : (
        <Summaries entries={result.entries} />
      )}
    </>
  );
}

/**
 * The standing warning. Its title is the one alert, so a screen reader hears
 * a major once, when it arrives; the sections inside are plain content.
 */
function Warning({ result }: { result: UpdateCheckResult }) {
  const title = !hasNotes(result)
    ? m.admin_overview_update_major_title_unknown
    : withBefore(result).length > 0
      ? m.admin_overview_update_major_title_todo
      : m.admin_overview_update_major_title_nothing;
  return (
    <div className="overview-update-warning">
      <TriangleAlert size={18} aria-hidden className="fuwari-callout-icon" />
      <div>
        <p role="alert" className="overview-update-warning-title">
          {title({ version: result.latestVersion })}
        </p>
        <Notes result={result} sections />
      </div>
    </div>
  );
}

function hasNotes(result: UpdateCheckResult) {
  return result.notesAvailable && result.entries.length > 0;
}

function withBefore(result: UpdateCheckResult) {
  return result.entries.filter((entry) => (entry.before?.length ?? 0) > 0);
}

/** One line per version, oldest first: the version, then its summary. */
function Summaries({ entries }: { entries: ReadonlyArray<Entry> }) {
  return (
    <ol className="overview-update-list">
      {entries.map((entry) => (
        <li key={entry.version}>
          <b>v{entry.version}</b>
          <span>{entry.summary}</span>
        </li>
      ))}
    </ol>
  );
}
