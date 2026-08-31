import { useEffect, type ReactNode } from "react";
import { useAdminChrome } from "@/components/admin/admin-chrome";
import { SettingsNav } from "@/features/config/components/admin/settings-nav";
import type { SettingsPageId } from "@/features/config/components/admin/settings-pages";
import { m } from "@/paraglide/messages";

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
  };
  children: ReactNode;
}) {
  const { setPrimaryAction } = useAdminChrome();
  const saveLabel = save?.busy ? m.settings_saving() : m.settings_save();

  useEffect(() => {
    if (!save) {
      setPrimaryAction(null);
      return;
    }
    setPrimaryAction({
      label: saveLabel,
      disabled: save.disabled || save.busy,
      onClick: () => {
        const form = document.getElementById(FORM_ID);
        if (form instanceof HTMLFormElement) form.requestSubmit();
      },
    });
    return () => setPrimaryAction(null);
  }, [save, saveLabel, setPrimaryAction]);

  return (
    <div
      className="fuwari-card-base p-5 md:p-6 space-y-6 fuwari-onload-animation"
      style={{ animationDelay: "calc(var(--fuwari-content-delay) + 100ms)" }}
    >
      <div className="hidden lg:flex justify-between items-center gap-3">
        <h1 className="text-2xl font-medium fuwari-text-90">{title}</h1>
        {save ? (
          <button
            type="submit"
            form={FORM_ID}
            disabled={save.disabled || save.busy}
            className="fuwari-btn-primary rounded-xl h-10 px-5 text-sm font-medium disabled:opacity-50"
          >
            {saveLabel}
          </button>
        ) : null}
      </div>
      {nav ? <SettingsNav current={nav} /> : null}
      {children}
    </div>
  );
}

export { FORM_ID as SETTINGS_FORM_ID };
