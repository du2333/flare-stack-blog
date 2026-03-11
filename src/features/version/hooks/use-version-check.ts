import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { ms } from "@/lib/duration";
import { m } from "@/paraglide/messages";
import { updateCheckQuery } from "../queries";

export function useVersionCheck() {
  const { data: updateData } = useQuery(updateCheckQuery);

  useEffect(() => {
    if (!updateData || updateData.error || !updateData.data.hasUpdate) return;

    const { data } = updateData;
    const lastToastTime = localStorage.getItem("last_version_check_toast");
    const ignoredVersion = localStorage.getItem("ignored_version");
    const now = Date.now();
    const ONE_DAY = ms("1d");

    if (
      ignoredVersion !== data.latestVersion &&
      (!lastToastTime || now - parseInt(lastToastTime) > ONE_DAY)
    ) {
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
          onClick: () =>
            localStorage.setItem("ignored_version", data.latestVersion),
        },
        duration: ms("15s"),
      });
      localStorage.setItem("last_version_check_toast", now.toString());
    }
  }, [updateData]);

  return { updateData };
}
