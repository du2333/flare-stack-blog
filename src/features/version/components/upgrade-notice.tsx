import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { NoticeSheet } from "@/features/dashboard/components/notice-sheet";
import { useAcknowledgeUpgradeNotice } from "@/features/version/hooks/use-acknowledge-upgrade-notice";
import { upgradeNoticeQuery } from "@/features/version/queries";
import type { UpgradeNotice as Notice } from "@/features/version/upgrade-notice.schema";
import { m } from "@/paraglide/messages";

/**
 * The notice of 「概览」 after an upgrade, one line under the update line:
 * 「已更新到 vX」, with the count of `after` items of this version and of
 * every version since the last one the Admin acknowledged. With items,
 * 「查看」 opens a sheet listing each version with its summary and items.
 * 「知道了」 records the running version on the server, so the notice is gone
 * for every browser, and focus moves to the update line's first control.
 *
 * It renders nothing while the read is loading, when it fails and when there
 * is nothing to show, and it never delays the page: the read starts after
 * the first paint.
 *
 * The confirmation is announced from a live region that stays mounted after
 * the notice is gone; a failure is announced from a region inside the notice
 * or its sheet, which stays. The notes come from a file: every string here
 * is a text node, never HTML, Markdown or a link.
 */
export function UpgradeNotice() {
  const query = useQuery({
    ...upgradeNoticeQuery,
    enabled: typeof window !== "undefined",
  });
  const acknowledge = useAcknowledgeUpgradeNotice();
  const [acknowledged, setAcknowledged] = useState<string | null>(null);
  const notice = query.data?.notice ?? null;

  // The notice is gone and with it the control that had focus: the update
  // line's first control, which is still there, takes it.
  useEffect(() => {
    if (acknowledged === null) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    document.querySelector<HTMLElement>("[data-notices-anchor]")?.focus();
  }, [acknowledged]);

  return (
    <>
      {notice ? (
        <NoticeBody
          notice={notice}
          acknowledging={acknowledge.isPending}
          failed={acknowledge.isError}
          onAcknowledge={() => {
            if (acknowledge.isPending) return;
            acknowledge.mutate(undefined, {
              onSuccess: () => setAcknowledged(notice.version),
            });
          }}
          onOpenDetails={() => acknowledge.reset()}
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
  onOpenDetails,
}: {
  notice: Notice;
  acknowledging: boolean;
  failed: boolean;
  onAcknowledge: () => void;
  onOpenDetails: () => void;
}) {
  const [open, setOpen] = useState(false);
  const count = notice.entries.reduce(
    (sum, entry) => sum + (entry.after?.length ?? 0),
    0,
  );
  const version = `v${notice.version}`;
  const failure =
    failed && !acknowledging ? m.admin_overview_upgrade_failed() : "";
  const ack = (
    <Button
      variant="quiet"
      size="xs"
      icon={acknowledging ? <Spinner size={14} /> : undefined}
      aria-disabled={acknowledging || undefined}
      onClick={onAcknowledge}
    >
      {m.admin_overview_upgrade_ack()}
    </Button>
  );

  return (
    <>
      <div className="overview-line overview-upgrade" data-state="line">
        <div className="overview-line-text">
          <span className="overview-line-mark" aria-hidden>
            <Check size={14} className="is-accent" />
          </span>
          <div className="overview-line-words">
            <span>
              {count > 0
                ? m.admin_overview_upgrade_title_todo({ version, count })
                : m.admin_overview_upgrade_title({ version })}
            </span>
            {/* With the sheet open the failure is said inside it. */}
            <span
              role="alert"
              className="overview-line-failure"
              data-tone="danger"
            >
              {open ? "" : failure}
            </span>
          </div>
        </div>
        <div className="overview-line-actions">
          {count > 0 ? (
            <Button
              variant="quiet"
              size="xs"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={(event) => {
                // Safari does not focus a button when it is clicked.
                event.currentTarget.focus();
                onOpenDetails();
                setOpen(true);
              }}
            >
              {m.admin_overview_update_view()}
            </Button>
          ) : null}
          {ack}
        </div>
      </div>
      {count > 0 ? (
        <NoticeSheet
          open={open}
          onClose={() => setOpen(false)}
          title={m.admin_overview_upgrade_title({ version })}
          failure={open ? failure : ""}
          actions={
            <Button
              variant="outline"
              size="sm"
              icon={acknowledging ? <Spinner size={14} /> : undefined}
              aria-disabled={acknowledging || undefined}
              onClick={onAcknowledge}
            >
              {m.admin_overview_upgrade_ack()}
            </Button>
          }
        >
          <ol className="overview-sheet-list">
            {notice.entries.map((entry) => (
              <li key={entry.version}>
                <b>v{entry.version}</b>
                <div>
                  <span>{entry.summary}</span>
                  {entry.after ? (
                    <ul className="overview-sheet-todo">
                      {entry.after.map((item) => (
                        <li key={item.id}>{item.text}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </NoticeSheet>
      ) : null}
    </>
  );
}
