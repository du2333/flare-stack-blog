import * as kvStore from "@/features/cache/kv-store";
import {
  decideUpgradeNotice,
  mayRecord,
} from "@/features/version/upgrade-notice";
import type { UpgradeNoticeResult } from "@/features/version/upgrade-notice.schema";
import { ACKNOWLEDGED_VERSION_KEY } from "@/features/version/upgrade-notice.schema";
import type { UpgradesFile } from "@/lib/version/upgrades";
import { ownUpgradesFile } from "@/lib/version/upgrades";

// The version an Admin acknowledged is kept on the server, not in a browser:
// what the notice lists is work for the whole site, so another browser must
// not show it again and a cleared one must not lose it.

type Sources = {
  /** The version that runs. */
  running?: string;
  /** The notes file of this build. */
  file?: UpgradesFile;
};

/**
 * The notice for the running version. With no record yet (the first
 * deployment that has this feature) it records the running version and shows
 * nothing; see `decideUpgradeNotice` for the rules.
 */
export async function readUpgradeNotice(
  context: BaseContext,
  sources: Sources = {},
): Promise<UpgradeNoticeResult> {
  const running = sources.running ?? __APP_VERSION__;
  const acknowledged = await kvStore.get(context, ACKNOWLEDGED_VERSION_KEY);
  const { record, notice } = decideUpgradeNotice({
    acknowledged,
    running,
    file: sources.file ?? ownUpgradesFile(),
  });
  if (record !== null) {
    await kvStore.put(context, ACKNOWLEDGED_VERSION_KEY, record);
  }
  return { notice };
}

/** Records the running version as acknowledged, unless the record is newer. */
export async function acknowledgeUpgradeNotice(
  context: BaseContext,
  sources: Pick<Sources, "running"> = {},
): Promise<{ success: boolean }> {
  const running = sources.running ?? __APP_VERSION__;
  const acknowledged = await kvStore.get(context, ACKNOWLEDGED_VERSION_KEY);
  if (mayRecord(acknowledged, running)) {
    await kvStore.put(context, ACKNOWLEDGED_VERSION_KEY, running);
  }
  return { success: true };
}
