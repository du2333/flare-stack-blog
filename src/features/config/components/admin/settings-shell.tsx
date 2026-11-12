import { CircleAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-heading";
import { useContentMotion } from "@/hooks/use-motion";
import { SettingsNav } from "./settings-nav";
import { isSaveBarVisible } from "./save-bar";
import type { SettingsPageId } from "./settings-pages";
import type { PERSONALIZE_PAGE } from "@/features/config/utils/site-field-pages";
import { Callout } from "@/components/ui/callout";
import { m } from "@/paraglide/messages";
import "./settings.css";
const FORM_ID = "system-config-form";
export function SettingsShell({
  title,
  nav,
  save,
  children,
}: {
  title: string;
  /** A settings page, or 「个性化」, which has the shell but no settings tabs. */
  nav?: SettingsPageId | typeof PERSONALIZE_PAGE;
  save?: {
    disabled: boolean;
    busy: boolean;
    dirty?: boolean;
    conflict?: boolean;
    onDiscard?: () => void;
    /** Takes in what was saved elsewhere and keeps the typed input. */
    onReload?: () => void;
  };
  children: ReactNode;
}) {
  const { setPrimaryAction } = useAdminChrome();
  useEffect(() => {
    setPrimaryAction(null);
    return () => setPrimaryAction(null);
  }, [setPrimaryAction]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useContentMotion(scrollRef, nav ?? "directory");
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [nav]);
  const personalize = nav === "personalize";
  const saveLabel = save?.busy
    ? m.settings_saving()
    : personalize
      ? m.personalize_save()
      : nav === "site"
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
    <div
      className="settings-workspace admin-workspace admin-frame fuwari-card-base"
      data-section={nav}
    >
      <PageHeader
        title={personalize ? m.personalize_title() : m.settings_header_title()}
      />
      {nav && !personalize && <SettingsNav current={nav} />}
      <div
        className="settings-body admin-frame-bleed"
        ref={scrollRef}
        role="region"
        aria-label={title}
      >
        {children}
        {save && saveBarVisible && (
          <footer className="settings-savebar">
            {save.dirty && (
              <Callout
                role="status"
                tone={save.conflict ? "danger" : "warning"}
                icon={CircleAlert}
              >
                {save.conflict
                  ? save.onReload
                    ? m.settings_config_conflict_site()
                    : m.settings_config_conflict()
                  : m.settings_config_unsaved()}
              </Callout>
            )}
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
    </div>
  );
}
export { FORM_ID as SETTINGS_FORM_ID };
