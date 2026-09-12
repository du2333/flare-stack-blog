import { CircleAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { useContentMotion } from "@/hooks/use-motion";
import { SettingsNav } from "./settings-nav";
import type { SettingsPageId } from "./settings-pages";
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
    <div className="settings-workspace fuwari-card-base" data-section={nav}>
      <header className="settings-heading">
        <h1>{m.settings_header_title()}</h1>
        <p>{m.settings_design_intro()}</p>
      </header>
      {nav && <SettingsNav current={nav} />}
      <div className="settings-body" ref={scrollRef} aria-label={title}>
        {children}
      </div>
      {save && (
        <footer className="settings-savebar">
          {save.dirty && (
            <p
              role="status"
              className={
                save.conflict
                  ? "settings-save-notice settings-error"
                  : "settings-save-notice"
              }
            >
              <CircleAlert size={17} aria-hidden="true" />
              <span>
                {save.conflict
                  ? m.settings_config_conflict()
                  : m.settings_config_unsaved()}
              </span>
            </p>
          )}
          <div>
            {save.dirty && (
              <button
                type="button"
                disabled={save.busy}
                onClick={save.onDiscard}
                className="settings-button fuwari-btn-regular"
              >
                {m.settings_design_discard()}
              </button>
            )}
            <button
              type="submit"
              form={FORM_ID}
              disabled={save.disabled || save.busy}
              className="settings-button fuwari-btn-primary"
            >
              {saveLabel}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
export { FORM_ID as SETTINGS_FORM_ID };
