import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Mail } from "lucide-react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { useApiKeys } from "@/features/api-keys/hooks/use-api-keys";
import {
  SETTINGS_PAGE_TO,
  type SettingsPageId,
} from "@/features/config/components/admin/settings-pages";
import { systemConfigQuery } from "@/features/config/queries";
import { m } from "@/paraglide/messages";

export function SettingsDirectory() {
  const { siteConfig } = useRouteContext({ from: "__root__" });
  const { data: settings } = useQuery(systemConfigQuery);
  const { keys } = useApiKeys();
  const banner = siteConfig.theme.fuwari.homeBg;
  const avatar = siteConfig.theme.fuwari.avatar;
  const emailOn = Boolean(
    settings?.email?.host?.trim() &&
    settings?.email?.username?.trim() &&
    settings?.email?.password?.trim() &&
    settings?.email?.senderAddress?.trim(),
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Dest
        to="site"
        title={m.settings_nav_site()}
        hint={m.settings_dest_site_hint()}
      >
        <div className="relative h-24 rounded-xl overflow-hidden bg-(--fuwari-btn-regular-bg)">
          {banner ? (
            <img src={banner} alt="" className="w-full h-full object-cover" />
          ) : null}
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="absolute left-1/2 bottom-2 -translate-x-1/2 w-10 h-10 rounded-full ring-2 ring-white object-cover"
            />
          ) : null}
        </div>
      </Dest>

      <Dest
        to="notify"
        title={m.settings_nav_notify()}
        hint={m.settings_dest_notify_hint()}
        pill={emailOn ? m.settings_connected() : m.settings_not_connected()}
        pillOn={emailOn}
      >
        <div className="h-24 rounded-xl bg-(--fuwari-btn-regular-bg) grid place-items-center">
          <Mail size={28} className="text-(--fuwari-primary)" />
        </div>
      </Dest>

      <Dest
        to="api-keys"
        title={m.settings_nav_api_keys()}
        hint={m.settings_dest_api_keys_hint({ count: keys.length })}
      >
        <div className="h-24 rounded-xl bg-(--fuwari-btn-regular-bg) p-3 flex flex-col justify-center gap-2">
          <div className="h-2 w-3/4 rounded-full bg-black/8 dark:bg-white/15" />
          <div className="h-2 w-1/2 rounded-full bg-black/8 dark:bg-white/15" />
        </div>
      </Dest>

      <Dest
        to="maintenance"
        title={m.settings_nav_maintenance()}
        hint={m.settings_dest_maintenance_hint()}
      >
        <div className="h-24 rounded-xl bg-(--fuwari-btn-regular-bg) grid place-items-center">
          <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-(--fuwari-primary)" />
            <span className="w-3 h-3 rounded-full bg-(--fuwari-success)" />
            <span className="w-3 h-3 rounded-full bg-(--fuwari-warning)" />
            <span className="w-3 h-3 rounded-full bg-black/20 dark:bg-white/25" />
          </div>
        </div>
      </Dest>
    </div>
  );
}

function Dest({
  to,
  title,
  hint,
  pill,
  pillOn,
  children,
}: {
  to: SettingsPageId;
  title: string;
  hint: string;
  pill?: string;
  pillOn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      from="/admin/settings"
      to={SETTINGS_PAGE_TO[to]}
      className="flex items-center gap-4 rounded-2xl bg-(--fuwari-btn-regular-bg)/55 p-4 text-left hover:bg-(--fuwari-btn-regular-bg) transition-colors"
    >
      <div className="w-[42%] max-w-44 shrink-0">{children}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-base font-medium fuwari-text-90">{title}</p>
          {pill ? (
            <span
              className={
                pillOn
                  ? "h-5 px-1.5 rounded-full text-[11px] bg-(--fuwari-success-bg) text-(--fuwari-success-fg)"
                  : "h-5 px-1.5 rounded-full text-[11px] bg-(--fuwari-btn-regular-bg) fuwari-text-50"
              }
            >
              {pill}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm fuwari-text-50">{hint}</p>
      </div>
      <ChevronRight size={18} className="fuwari-text-30 shrink-0" />
    </Link>
  );
}
