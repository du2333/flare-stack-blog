import { useBlocker } from "@tanstack/react-router";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { ConfigEditingContext } from "./config-editing";
import { m } from "@/paraglide/messages";
import type { ReactNode } from "react";
import { FormProvider } from "react-hook-form";
import type { SettingsPageId } from "@/features/config/components/admin/settings-pages";
import {
  SETTINGS_FORM_ID,
  SettingsShell,
} from "@/features/config/components/admin/settings-shell";
import { SettingsInnerSkeleton } from "@/features/config/components/admin/settings-skeleton";
import { SettingsNav } from "@/features/config/components/admin/settings-nav";
import { useSystemConfigForm } from "@/features/config/hooks/use-system-config-form";
import type { PERSONALIZE_PAGE } from "@/features/config/utils/site-field-pages";

export function SettingsSectionFrame({
  title,
  nav,
  children,
}: {
  title: string;
  nav: SettingsPageId | typeof PERSONALIZE_PAGE | null;
  children: ReactNode;
}) {
  const {
    methods,
    isLoading,
    isSubmitting,
    isDirty,
    sectionDirty,
    dirtySections,
    onSubmit,
    baseline,
    conflict,
    discardSection,
    reloadSection,
  } = useSystemConfigForm(nav);
  const personalize = nav === "personalize";
  const blocker = useBlocker({
    // The settings pages share one form; 「个性化」 has a form of its own.
    shouldBlockFn: ({ next }) =>
      isDirty &&
      !(
        personalize
          ? /^\/admin\/personalize(?:\/|$)/
          : /^\/admin\/settings(?:\/|$)/
      ).test(next.pathname),
    enableBeforeUnload: isDirty,
    withResolver: true,
  });
  const needsSave = nav === "site" || nav === "notify" || personalize;

  // An outgoing child can still render after the pathname points to the
  // directory. Keep its form context alive for the entire settings layout.
  return (
    <ConfigEditingContext.Provider value={{ ...baseline, dirtySections }}>
      <FormProvider {...methods}>
        {!nav ? (
          children
        ) : (
          <SettingsShell
            title={
              personalize ? m.personalize_title() : m.settings_header_title()
            }
            section={nav}
            regionLabel={title}
            tabs={
              nav === "personalize" ? undefined : <SettingsNav current={nav} />
            }
            save={
              needsSave
                ? {
                    disabled: !sectionDirty || isLoading,
                    busy: isSubmitting,
                    dirty: sectionDirty,
                    conflict,
                    onDiscard: () => void discardSection(),
                    // Only Site Config is shared by two pages.
                    onReload:
                      nav === "notify" ? undefined : () => void reloadSection(),
                  }
                : undefined
            }
          >
            {needsSave ? (
              <>
                <form
                  id={SETTINGS_FORM_ID}
                  onSubmit={onSubmit}
                  className="contents"
                >
                  {isLoading ? <SettingsInnerSkeleton /> : children}
                </form>
              </>
            ) : (
              children
            )}
          </SettingsShell>
        )}
        <ConfirmationModal
          isOpen={blocker.status === "blocked"}
          isLoading={isSubmitting}
          onClose={() => blocker.reset?.()}
          onConfirm={() => blocker.proceed?.()}
          title={m.settings_config_leave_title()}
          message={m.settings_config_leave_message()}
          confirmLabel={m.settings_config_leave_confirm()}
        />
      </FormProvider>
    </ConfigEditingContext.Provider>
  );
}
