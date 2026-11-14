import { Check, ChevronRight, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { StatusText } from "@/components/ui/status-text";
import type { UpdateCheckResult } from "@/features/version/update-check.schema";
import { m } from "@/paraglide/messages";
import { OverviewCard } from "./overview-card";

export type UpdateBlockProps = {
  /** The last known answer of the check; null before the first one. */
  result: UpdateCheckResult | null;
  /** A check is running: the first one, or 「重新检查」. */
  checking: boolean;
  /** The last check failed; `result` is then what an earlier check found. */
  failed: boolean;
  onRecheck: () => void;
};

type Entry = UpdateCheckResult["entries"][number];

/**
 * What the Admin is told about updates, by the size of the step to the
 * latest release (the result's `level`): a patch is one line with a link, a
 * minor is a card with each version's summary, a major is a standing warning
 * with what to do before syncing, and none of them can be dismissed. With
 * no update there is one quiet line. Every state keeps 「重新检查」.
 *
 * The notes come from a fetched file: every string here is a text node, never
 * HTML, Markdown or a link.
 */
export function UpdateBlock({
  result,
  checking,
  failed,
  onRecheck,
}: UpdateBlockProps) {
  const controls = (
    <Controls
      checking={checking}
      failed={failed && !checking}
      hasResult={result !== null}
      onRecheck={onRecheck}
    />
  );

  if (result === null) {
    return (
      <div className="overview-update" data-state="pending">
        <div className="overview-update-line">{controls}</div>
      </div>
    );
  }

  if (!result.hasUpdate) {
    return (
      <div className="overview-update" data-state="current">
        <div className="overview-update-line">
          <p className="overview-update-text" data-quiet="">
            <Check size={14} aria-hidden />
            {m.admin_overview_update_up_to_date({
              current: result.currentVersion,
            })}
          </p>
          {controls}
        </div>
      </div>
    );
  }

  const notes = result.notesAvailable && result.entries.length > 0;
  const link = <ReleaseLink href={result.releaseUrl} />;

  if (result.level === "major") {
    const withBefore = result.entries.filter(
      (entry) => (entry.before?.length ?? 0) > 0,
    );
    return (
      <div className="overview-update" data-state="major">
        <Callout
          tone="warning"
          icon={TriangleAlert}
          className="overview-update-warning"
          action={
            <div className="overview-update-actions">
              {link}
              {controls}
            </div>
          }
        >
          <p className="overview-update-warning-title">
            {m.admin_overview_update_major_title({
              version: result.latestVersion,
            })}
          </p>
          {notes ? (
            <>
              {withBefore.length > 0 ? (
                <section className="overview-update-section">
                  <h3>{m.admin_overview_update_before()}</h3>
                  {withBefore.map((entry) => (
                    <div key={entry.version}>
                      <p className="overview-update-version">
                        v{entry.version}
                      </p>
                      <ul className="overview-update-todo">
                        {entry.before?.map((item, index) => (
                          <li key={`${item.id}-${index}`}>{item.text}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              ) : null}
              <section className="overview-update-section">
                <h3>{m.admin_overview_update_summaries()}</h3>
                <Summaries entries={result.entries} />
              </section>
            </>
          ) : (
            <p className="overview-update-unavailable">
              {m.admin_overview_update_notes_unavailable()}
            </p>
          )}
        </Callout>
      </div>
    );
  }

  if (result.level === "minor") {
    return (
      <div className="overview-update" data-state="minor">
        <OverviewCard
          title={m.admin_overview_update_available({
            version: result.latestVersion,
          })}
          sub={m.admin_overview_update_current({
            current: result.currentVersion,
          })}
          i={1}
        >
          <div className="overview-update-body">
            {notes ? (
              <Summaries entries={result.entries} />
            ) : (
              <p className="overview-update-unavailable">
                {m.admin_overview_update_notes_unavailable()}
              </p>
            )}
            <div className="overview-update-actions">
              {link}
              {controls}
            </div>
          </div>
        </OverviewCard>
      </div>
    );
  }

  // A patch: one line, the new version and where its notes are.
  return (
    <div className="overview-update" data-state="patch">
      <div className="overview-update-line">
        <p className="overview-update-text">
          <i aria-hidden />
          {m.admin_overview_update_available({ version: result.latestVersion })}
        </p>
        {link}
        {controls}
      </div>
    </div>
  );
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

function ReleaseLink({ href }: { href: string }): ReactNode {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClass({ variant: "quiet", size: "xs" })}
    >
      {m.admin_overview_update_notes_link()}
      <ChevronRight size={14} aria-hidden />
    </a>
  );
}

/** What the check is doing or how it ended, and 「重新检查」. */
function Controls({
  checking,
  failed,
  hasResult,
  onRecheck,
}: {
  checking: boolean;
  failed: boolean;
  hasResult: boolean;
  onRecheck: () => void;
}) {
  return (
    <span className="overview-update-controls">
      {checking ? (
        <span role="status" className="overview-update-status">
          {m.admin_overview_update_checking()}
        </span>
      ) : failed ? (
        <StatusText error className="overview-update-status">
          {hasResult
            ? m.admin_overview_update_failed_kept()
            : m.admin_overview_update_failed()}
        </StatusText>
      ) : null}
      <Button
        variant="outline"
        size="xs"
        loading={checking}
        onClick={onRecheck}
      >
        {m.admin_overview_update_recheck()}
      </Button>
    </span>
  );
}
