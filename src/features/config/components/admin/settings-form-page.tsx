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
  nav: SettingsPageId;
  children: ReactNode;
}) {
  const { methods, isLoading, isSubmitting, isDirty, onSubmit } =
    useSystemConfigForm();
  const hueRaw = methods.watch("site.theme.fuwari.primaryHue");
  const hue =
    typeof hueRaw === "number" && !Number.isNaN(hueRaw) ? hueRaw : 250;
  const needsSave = nav === "site" || nav === "notify";
  useLiveDocumentHue(hue, isDirty, isLoading);

  return (
    <FormProvider {...methods}>
      <SettingsShell
        title={title}
        nav={nav}
        save={
          needsSave
            ? { disabled: !isDirty || isLoading, busy: isSubmitting }
            : undefined
        }
      >
        {needsSave ? (
          <form id={SETTINGS_FORM_ID} onSubmit={onSubmit} className="contents">
            {isLoading ? <SettingsInnerSkeleton /> : children}
          </form>
        ) : (
          children
        )}
      </SettingsShell>
    </FormProvider>
  );
}

function useLiveDocumentHue(hue: number, isDirty: boolean, isLoading: boolean) {
  const hueRef = useRef(hue);
  const dirtyRef = useRef(isDirty);
  const savedRef = useRef(hue);
  hueRef.current = hue;
  dirtyRef.current = isDirty;

  useEffect(() => {
    if (!isDirty) savedRef.current = hue;
  }, [hue, isDirty]);

  useLayoutEffect(() => {
    if (isLoading) return;
    document.documentElement.style.setProperty("--fuwari-hue", String(hue));
  }, [hue, isLoading]);

  useEffect(() => {
    return () => {
      document.documentElement.style.setProperty(
        "--fuwari-hue",
        String(dirtyRef.current ? savedRef.current : hueRef.current),
      );
    };
  }, []);
}
