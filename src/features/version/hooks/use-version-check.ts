import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { updateCheckQuery } from "../queries";
import { ms } from "@/lib/duration";

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
      toast("发现新版本", {
        description: `${data.latestVersion} 已发布。`,
        action: {
          label: "查看",
          onClick: () => window.open(data.releaseUrl, "_blank"),
        },
        cancel: {
          label: "忽略",
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
