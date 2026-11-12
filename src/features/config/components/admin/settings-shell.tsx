import { CircleAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { AdminPage } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { useContentMotion } from "@/hooks/use-motion";
import { m } from "@/paraglide/messages";
import { isSaveBarVisible } from "./save-bar";
import "./settings.css";

const FORM_ID = "system-config-form";

/**
 * The page frame for 「设置」, 「接入」, 「个性化」 and 「禁言名单」: a form
 * body that scrolls in .settings-body, with the save bar pinned to its foot
 * while a section has unsaved changes.
 */
export function SettingsShell({
  title,
  section,
  regionLabel,
  count,
  description,
  tabs,
  tools,
  body = "form",
  save,
  children,
}: {
  title: string;
  /** Marks the frame for the section's own styles, and resets the scroll. */
  section: string;
  /** Names the scrolling region: the current tab, or the page. */
  regionLabel: string;
  count?: ReactNode;
  description?: ReactNode;
  tabs?: ReactNode;
  tools?: ReactNode;
  /** `form` for settings, `list` for a list of rows (keys, muted users). */
  body?: "form" | "list";
  save?: {
    disabled: boolean;
    busy: boolean;
    dirty?: boolean;
    /** How many settings changed; the bar says so when it is known. */
    changedCount?: number;
    conflict?: boolean;
    onDiscard?: () => void;
    /** Takes in what was saved elsewhere and keeps the typed input. */
    onReload?: () => void;
  };
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useContentMotion(scrollRef, section);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [section]);
  const saveLabel = save?.busy
    ? m.settings_saving()
    : section === "personalize"
      ? m.personalize_save()
      : section === "site"
        ? m.settings_config_save_site()
        : m.settings_config_save_notifications();
  const saveBarVisible = save ? isSaveBarVisible(save) : false;
  // The bar covers the bottom of the scroller as it appears. Keep the field
  // being edited above it.
  useEffect(() => {
    if (!saveBarVisible) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && scrollRef.current?.contains(active))
      active.scrollIntoView({ block: "nearest" });
  }, [saveBarVisible]);
  return (
    <AdminPage
      className="settings-workspace"
      data-section={section}
      title={title}
      count={count}
      description={description}
      tabs={tabs}
      tools={tools}
      body={body}
      scroll={false}
    >
      <div
        className="settings-body admin-frame-bleed"
        ref={scrollRef}
        role="region"
        aria-label={regionLabel}
      >
        {children}
        {save && saveBarVisible && (
          <footer className="settings-savebar">
            {save.dirty && save.conflict ? (
              <Callout role="status" tone="danger" icon={CircleAlert}>
                {save.onReload
                  ? m.settings_config_conflict_site()
                  : m.settings_config_conflict()}
              </Callout>
            ) : save.dirty ? (
              <p className="settings-savebar-status" role="status">
                {save.changedCount == null
                  ? m.settings_config_unsaved()
                  : m.settings_config_changed_count({
                      count: save.changedCount,
                    })}
              </p>
            ) : null}
            <div>
              {save.conflict && save.onReload && (
                <Button disabled={save.busy} onClick={save.onReload}>
                  {m.settings_config_reload()}
                </Button>
              )}
              {save.dirty && (
                <Button disabled={save.busy} onClick={save.onDiscard}>
                  {m.settings_design_discard()}
                </Button>
              )}
              <Button
                type="submit"
                form={FORM_ID}
                variant="primary"
                disabled={save.disabled || save.busy}
              >
                {saveLabel}
              </Button>
            </div>
          </footer>
        )}
      </div>
    </AdminPage>
  );
}
export { FORM_ID as SETTINGS_FORM_ID };
