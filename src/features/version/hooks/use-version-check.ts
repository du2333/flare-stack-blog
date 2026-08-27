import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  ignoreUpdateNotice,
  recordUpdateNoticeShown,
  shouldShowUpdateNotice,
} from "@/features/version/update-notice";
import { ms } from "@/lib/duration";
import { m } from "@/paraglide/messages";
import { updateCheckQuery } from "../queries";

export function useVersionCheck() {
  const { data: updateData } = useQuery({
    ...updateCheckQuery,
    enabled: typeof window !== "undefined",
  });

  useEffect(() => {
    if (!updateData || !updateData.hasUpdate) return;

    const data = updateData;
    const now = Date.now();
    if (!shouldShowUpdateNotice(localStorage, data.latestVersion, now)) return;

    toast(m.version_toast_available(), {
      description: m.version_toast_available_desc({
        version: data.latestVersion,
      }),
      action: {
        label: m.version_action_view(),
        onClick: () => window.open(data.releaseUrl, "_blank"),
      },
      cancel: {
        label: m.version_action_ignore(),
        onClick: () => ignoreUpdateNotice(localStorage, data.latestVersion),
      },
      duration: ms("15s"),
    });
    recordUpdateNoticeShown(localStorage, data.latestVersion, now);
  }, [updateData]);
}
