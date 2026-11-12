import { blogConfig } from "@/blog.config";
import { useBlocker } from "@tanstack/react-router";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { ConfigEditingContext } from "./config-editing";
import { m } from "@/paraglide/messages";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { FormProvider } from "react-hook-form";
import type { SettingsPageId } from "@/features/config/components/admin/settings-pages";
import {
  SETTINGS_FORM_ID,
  SettingsShell,
} from "@/features/config/components/admin/settings-shell";
import { SettingsInnerSkeleton } from "@/features/config/components/admin/settings-skeleton";
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
  const hueRaw = methods.watch("site.primaryHue");
  const hue =
    typeof hueRaw === "number" && !Number.isNaN(hueRaw)
      ? hueRaw
      : blogConfig.primaryHue;
  const needsSave = nav === "site" || nav === "notify" || personalize;
  useLiveDocumentHue(
    hue,
    baseline.config.site?.primaryHue ?? blogConfig.primaryHue,
    isLoading,
  );

  // An outgoing child can still render after the pathname points to the
  // directory. Keep its form context alive for the entire settings layout.
  return (
    <ConfigEditingContext.Provider value={{ ...baseline, dirtySections }}>
      <FormProvider {...methods}>
        {!nav ? (
          children
        ) : (
          <SettingsShell
            title={title}
            nav={nav}
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

function useLiveDocumentHue(hue: number, savedHue: number, isLoading: boolean) {
  const savedRef = useRef(savedHue);
  savedRef.current = savedHue;
  useLayoutEffect(() => {
    if (isLoading) return;
    document.documentElement.style.setProperty("--fuwari-hue", String(hue));
  }, [hue, isLoading]);
  useEffect(
    () => () => {
      document.documentElement.style.setProperty(
        "--fuwari-hue",
        String(savedRef.current),
      );
    },
    [],
  );
}
