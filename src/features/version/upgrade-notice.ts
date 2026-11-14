import type {
  UpgradeNotice,
  UpgradeNoticeEntry,
} from "@/features/version/upgrade-notice.schema";
import { compareAppVersions, parseAppVersion } from "@/lib/version/app-version";
import type { UpgradeEntry, UpgradesFile } from "@/lib/version/upgrades";
import { entriesBetween } from "@/lib/version/upgrades";

/**
 * What the Admin is told after an upgrade, as a function of the version the
 * Admin last acknowledged, the version that runs and the build's notes file.
 *
 * - `record`: the version to write as acknowledged, or null to leave the
 *   record alone;
 * - `notice`: what to show, or null for nothing.
 *
 * The rules:
 * - no record (or one that is not a version): the first deployment that has
 *   this feature. The running version is recorded and nothing shows;
 * - the record equals the running version: nothing;
 * - the record is older: the notice, with the entries between, oldest first;
 * - the record is newer (a rollback): nothing, and the record stays.
 *
 * A running version that is not a version (a build without one) records and
 * shows nothing. A prerelease compares by semver, like everywhere else.
 */
export function decideUpgradeNotice({
  acknowledged,
  running,
  file,
}: {
  acknowledged: string | null;
  running: string;
  file: UpgradesFile;
}): { record: string | null; notice: UpgradeNotice | null } {
  if (!parseAppVersion(running)) return { record: null, notice: null };
  if (acknowledged === null || !parseAppVersion(acknowledged)) {
    return { record: running, notice: null };
  }
  if (compareAppVersions(acknowledged, running) !== -1) {
    return { record: null, notice: null };
  }
  return {
    record: null,
    notice: {
      version: running,
      entries: entriesBetween(file, acknowledged, running).map(toNoticeEntry),
    },
  };
}

/** Whether acknowledging `running` may overwrite `acknowledged`: never a newer record. */
export function mayRecord(acknowledged: string | null, running: string) {
  if (!parseAppVersion(running)) return false;
  if (acknowledged === null || !parseAppVersion(acknowledged)) return true;
  return compareAppVersions(acknowledged, running) === -1;
}

/** The entry reduced to what the notice shows; an empty `after` is no `after`. */
function toNoticeEntry(entry: UpgradeEntry): UpgradeNoticeEntry {
  const notice: UpgradeNoticeEntry = {
    version: entry.version,
    summary: entry.summary,
  };
  if (entry.after && entry.after.length > 0) {
    notice.after = entry.after.map(({ id, text }) => ({ id, text }));
  }
  return notice;
}
