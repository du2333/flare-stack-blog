import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAcknowledgeUpgradeNotice } from "@/features/version/hooks/use-acknowledge-upgrade-notice";
import { upgradeNoticeQuery } from "@/features/version/queries";
import type { UpgradeNotice as Notice } from "@/features/version/upgrade-notice.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * The notice of 「概览」 after an upgrade: 「已更新到 vX」, and the `after`
 * items of this version and of every version since the last one the Admin
 * acknowledged. 「知道了」 records the running version on the server, so the
 * notice is gone for every browser.
 *
 * It sits below the update block and speaks in the same forms: with no item
 * anywhere it is one line, with items a card. It renders nothing while the
 * read is loading, when it fails and when there is nothing to show, and it
 * never delays the page: the read starts after the first paint.
 *
 * The confirmation is announced from a live region that stays mounted after
 * the notice is gone; a failure is announced from one inside the notice,
 * which stays. The notes come from a file: every string here is a text node,
 * never HTML, Markdown or a link.
 */
export function UpgradeNotice() {
  const query = useQuery({
    ...upgradeNoticeQuery,
    enabled: typeof window !== "undefined",
  });
  const acknowledge = useAcknowledgeUpgradeNotice();
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  const notice = query.data?.notice ?? null;

  return (
    <>
      {notice ? (
        <NoticeBody
          notice={notice}
          acknowledging={acknowledge.isPending}
          failed={acknowledge.isError}
          onAcknowledge={() =>
            acknowledge.mutate(undefined, {
              onSuccess: () => setAcknowledged(notice.version),
            })
          }
        />
      ) : null}
      {/* Mounted from the start, so the text is announced when it arrives. */}
      <span role="status" className="sr-only">
        {acknowledged
          ? m.admin_overview_upgrade_acked({ version: `v${acknowledged}` })
          : ""}
      </span>
    </>
  );
}

function NoticeBody({
  notice,
  acknowledging,
  failed,
  onAcknowledge,
}: {
  notice: Notice;
  acknowledging: boolean;
  failed: boolean;
  onAcknowledge: () => void;
}) {
  const withItems = notice.entries.some(
    (entry) => (entry.after?.length ?? 0) > 0,
  );
  const title = m.admin_overview_upgrade_title({
    version: `v${notice.version}`,
  });

  return (
    <div
      className={cn("overview-upgrade", withItems && "overview-card")}
      data-state={withItems ? "card" : "line"}
      data-line={withItems ? undefined : ""}
    >
      {withItems ? (
        <>
          <header className="overview-card-head">
            <h2 className="overview-card-title">{title}</h2>
            <span className="overview-card-sub">
              {m.admin_overview_upgrade_todo()}
            </span>
          </header>
          <div className="overview-upgrade-body">
            <ol className="overview-upgrade-list">
              {notice.entries.map((entry) => (
                <li key={entry.version}>
                  <b>v{entry.version}</b>
                  <div>
                    <span>{entry.summary}</span>
                    {entry.after ? (
                      <ul className="overview-update-todo">
                        {entry.after.map((item) => (
                          <li key={item.id}>{item.text}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <p className="overview-update-text">
          <i aria-hidden />
          {title}
        </p>
      )}
      <div className="overview-upgrade-actions">
        <span
          role="alert"
          className="overview-update-status"
          data-tone="danger"
        >
          {failed && !acknowledging ? m.admin_overview_upgrade_failed() : ""}
        </span>
        <Button
          variant="outline"
          size="xs"
          loading={acknowledging}
          onClick={onAcknowledge}
        >
          {m.admin_overview_upgrade_ack()}
        </Button>
      </div>
    </div>
  );
}
