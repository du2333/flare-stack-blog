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

export function SettingsSectionFrame({
  title,
  nav,
  children,
}: {
  title: string;
  nav: SettingsPageId | null;
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
  } = useSystemConfigForm(nav);
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) =>
      isDirty && !/^\/admin\/settings(?:\/|$)/.test(next.pathname),
    enableBeforeUnload: isDirty,
    withResolver: true,
  });
  const hueRaw = methods.watch("site.theme.fuwari.primaryHue");
  const hue =
    typeof hueRaw === "number" && !Number.isNaN(hueRaw) ? hueRaw : 250;
  const needsSave = nav === "site" || nav === "notify";
  useLiveDocumentHue(
    hue,
    baseline.config.site?.theme?.fuwari?.primaryHue ?? 250,
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
