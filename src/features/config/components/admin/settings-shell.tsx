import { CircleAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-heading";
import { useContentMotion } from "@/hooks/use-motion";
import { SettingsNav } from "./settings-nav";
import type { SettingsPageId } from "./settings-pages";
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
  nav?: SettingsPageId;
  save?: {
    disabled: boolean;
    busy: boolean;
    dirty?: boolean;
    conflict?: boolean;
    onDiscard?: () => void;
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
  const saveLabel = save?.busy
    ? m.settings_saving()
    : nav === "site"
      ? m.settings_config_save_site()
      : m.settings_config_save_notifications();
  return (
    <div
      className="settings-workspace admin-workspace admin-frame fuwari-card-base"
      data-section={nav}
    >
      <PageHeader
        title={m.settings_header_title()}
        description={m.settings_design_intro()}
      />
      {nav && <SettingsNav current={nav} />}
      <div
        className="settings-body admin-frame-bleed"
        ref={scrollRef}
        aria-label={title}
      >
        {children}
      </div>
      {save && (
        <footer className="settings-savebar admin-frame-bleed">
          {save.dirty && (
            <Callout
              role="status"
              tone={save.conflict ? "danger" : "warning"}
              icon={CircleAlert}
            >
              {save.conflict
                ? m.settings_config_conflict()
                : m.settings_config_unsaved()}
            </Callout>
          )}
          <div>
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
  );
}
export { FORM_ID as SETTINGS_FORM_ID };
